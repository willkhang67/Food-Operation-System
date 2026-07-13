import { UserRole } from '../enums/user-role.enum';

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
