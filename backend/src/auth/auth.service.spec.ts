import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { PasswordHasherService } from '../crypto/password-hasher.service';
import { UserRole } from '../user/enums/user-role.enum';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: {
    findByEmail: jest.Mock;
    toPublicUser: jest.Mock;
  };
  let passwordHasher: { verify: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    userService = {
      findByEmail: jest.fn(),
      toPublicUser: jest.fn(),
    };
    passwordHasher = { verify: jest.fn() };
    jwtService = { signAsync: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: PasswordHasherService, useValue: passwordHasher },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) =>
              key === 'JWT_EXPIRES_IN' ? '1d' : fallback,
            ),
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

  it('returns a bearer token for valid credentials', async () => {
    const user = {
      id: 'user-id',
      role: UserRole.USER,
      passwordHash: 'hash',
    };
    userService.findByEmail.mockResolvedValue(user);
    passwordHasher.verify.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('jwt-token');
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

    expect(result.accessToken).toBe('jwt-token');
    expect(result.tokenType).toBe('Bearer');
    expect(result.user.id).toBe('user-id');
  });
});
