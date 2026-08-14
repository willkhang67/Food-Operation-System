import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RequestUser } from '../interfaces/request-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly userService: UserService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    // Reject refresh tokens (and any JWT missing typ=access) on protected routes.
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userService.findEntityById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    // Prefer DB role so revoked/changed roles take effect without waiting for token expiry.
    return {
      id: user.id,
      role: user.role,
    };
  }
}
