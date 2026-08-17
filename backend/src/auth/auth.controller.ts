import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { UserService } from '../user/user.service';
import type { RequestUser } from './interfaces/request-user.interface';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { extractBearer } from './utils/extract-bearer';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /** BFF sends refresh JWT as Authorization: Bearer <refresh>. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  refresh(
    @Headers('authorization') authorization?: string,
  ): Promise<AuthResponseDto> {
    const token = extractBearer(authorization);
    if (!token) {
      throw new UnauthorizedException('Refresh token required');
    }
    return this.authService.refresh(token);
  }

  /** Best-effort revoke; always 204 so BFF can clear cookies. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Headers('authorization') authorization?: string): Promise<void> {
    return this.authService.logout(extractBearer(authorization) ?? undefined);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: RequestUser): Promise<UserResponseDto> {
    return this.userService.findOne(user.id);
  }
}
