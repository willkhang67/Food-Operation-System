import { UserResponseDto } from '../../user/dto/user-response.dto';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  tokenType!: 'Bearer';
  expiresIn!: string;
  refreshExpiresIn!: string;
  user!: UserResponseDto;
}