import { UserRole } from '../../user/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  typ: 'access' | 'refresh';
  /** Required on refresh tokens for rotation / reuse detection. */
  jti?: string;
}
