import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordHasherService } from '../crypto/password-hasher.service';
import { UserRole } from '../user/enums/user-role.enum';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userService: {
    findByEmail: jest.Mock;
    toPublicUser: jest.Mock;
  };
  let passwordHasher: { verify: jest.Mock };
  let jwtService: { signAsync: jest.Mock; decode: jest.Mock };
  let refreshRepo: {
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    userService = {
      findByEmail: jest.fn(),
      toPublicUser: jest.fn(),
    };
    passwordHasher = { verify: jest.fn() };
    jwtService = {
      signAsync: jest.fn(),
      decode: jest.fn(),
    };
    refreshRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: PasswordHasherService, useValue: passwordHasher },
        { provide: JwtService, useValue: jwtService },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              if (key === 'JWT_EXPIRES_IN') return '30m';
              if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              return fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects invalid credentials with a generic message', async () => {
    userService.findByEmail.mockResolvedValue(null);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.login({ email: 'a@b.com', password: 'secret1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns access + refresh tokens for valid credentials', async () => {
    const user = {
      id: 'user-id',
      role: UserRole.USER,
      passwordHash: 'hash',
    };
    userService.findByEmail.mockResolvedValue(user);
    passwordHasher.verify.mockResolvedValue(true);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    jwtService.decode.mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    });
    userService.toPublicUser.mockReturnValue({
      id: user.id,
      email: 'a@b.com',
      name: 'A',
      phone: null,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.login({
      email: 'a@b.com',
      password: 'secret1',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.tokenType).toBe('Bearer');
    expect(result.refreshExpiresIn).toBe('7d');
    expect(result.user.id).toBe('user-id');
    expect(refreshRepo.save).toHaveBeenCalled();
  });
});
