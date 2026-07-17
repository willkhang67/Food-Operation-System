import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PasswordHasherService } from '../crypto/password-hasher.service';
import { UserService } from '../user/user.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * Precomputed Argon2id hash used when the user does not exist,
 * so missing-user and wrong-password paths take similar time.
 */
const TIMING_SAFE_DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$wBGH7kKykevNqOoXmftpEw$mO8rq6eLuFj+EgC6RDuhKmH5iFaZ96N4prhHt3uI6Mc';

@Injectable()
export class AuthService {
  private readonly expiresIn: string;

  constructor(
    private readonly userService: UserService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.expiresIn = config.get<string>('JWT_EXPIRES_IN', '1d');
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

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresIn,
      user: this.userService.toPublicUser(user),
    };
  }
}
