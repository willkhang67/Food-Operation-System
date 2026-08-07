import { UserRole } from '../../user/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  typ: 'access' | 'refresh';
  jti: string; // requird on refresh
}
