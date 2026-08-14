import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { PasswordHasherService } from '../crypto/password-hasher.service';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { hashToken } from './utils/hash-token';

/**
 * Precomputed Argon2id hash used when the user does not exist,
 * so missing-user and wrong-password paths take similar time.
 */
const TIMING_SAFE_DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$wBGH7kKykevNqOoXmftpEw$mO8rq6eLuFj+EgC6RDuhKmH5iFaZ96N4prhHt3uI6Mc';

@Injectable()
export class AuthService {
  private readonly expiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly userService: UserService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    config: ConfigService,
  ) {
    this.expiresIn = config.get<string>('JWT_EXPIRES_IN', '30m');

    const refreshSecret = config.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    this.refreshSecret = refreshSecret;
    this.refreshExpiresIn = config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userService.findByEmail(loginDto.email);
    const passwordHash = user?.passwordHash ?? TIMING_SAFE_DUMMY_HASH;
    const passwordValid = await this.passwordHasher.verify(
      loginDto.password,
      passwordHash,
    );

    if (!user || !passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokenPair(user);
  }

  /**
   * Rotate refresh: revoke current row, mint a new pair in the same family.
   * Presenting an already-revoked refresh revokes the whole family (theft signal).
   */
  async refresh(rawRefreshToken: string): Promise<AuthResponseDto> {
    const payload = await this.verifyRefreshToken(rawRefreshToken);
    const existing = await this.refreshRepo.findOne({
      where: { jti: payload.jti },
    });

    if (!existing || existing.tokenHash !== hashToken(rawRefreshToken)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      await this.refreshRepo.update(
        { familyId: existing.familyId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userService.findEntityById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newJti = randomUUID();
    existing.revokedAt = new Date();
    existing.replacedByJti = newJti;
    await this.refreshRepo.save(existing);

    return this.issueTokenPair(user, existing.familyId, newJti);
  }

  /** Best-effort revoke. Always resolves so BFF logout stays idempotent. */
  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(rawRefreshToken);
      await this.refreshRepo.update(
        { jti: payload.jti, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    } catch {
      // Intentionally swallow — BFF clears cookies regardless.
    }
  }

  /**
   * Mint access + refresh JWTs and persist a hashed refresh row.
   * New logins start a new rotation family (familyId === jti).
   */
  private async issueTokenPair(
    user: User,
    familyId?: string,
    jti: string = randomUUID(),
  ): Promise<AuthResponseDto> {
    const resolvedFamilyId = familyId ?? jti;

    const accessPayload: JwtPayload = {
      sub: user.id,
      role: user.role,
      typ: 'access',
    };
    const accessToken = await this.jwtService.signAsync(accessPayload);

    const refreshPayload: JwtPayload = {
      sub: user.id,
      role: user.role,
      typ: 'refresh',
      jti,
    };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn as
        | `${number}d`
        | `${number}h`
        | `${number}m`,
    });

    const decoded = this.jwtService.decode<{ exp: number }>(refreshToken);
    if (!decoded?.exp) {
      throw new Error('Failed to decode refresh token expiry');
    }
    const expiresAt = new Date(decoded.exp * 1000);

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        jti,
        familyId: resolvedFamilyId,
        expiresAt,
        revokedAt: null,
        replacedByJti: null,
      }),
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresIn,
      refreshExpiresIn: this.refreshExpiresIn,
      user: this.userService.toPublicUser(user),
    };
  }

  private async verifyRefreshToken(
    rawRefreshToken: string,
  ): Promise<JwtPayload & { jti: string }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(rawRefreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return payload as JwtPayload & { jti: string };
  }
}
