import { UserRole } from '../../user/enums/user-role.enum';

/** Attached to request after JwtAuthGuard validates the token. */
export interface RequestUser {
  id: string;
  role: UserRole;
}
