import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordHasherService } from '../crypto/password-hasher.service';
import { UserRole } from '../user/enums/user-role.enum';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { hashToken } from './utils/hash-token';

describe('AuthService', () => {
  let service: AuthService;
  let userService: {
    findByEmail: jest.Mock;
    findEntityById: jest.Mock;
    toPublicUser: jest.Mock;
  };
  let passwordHasher: { verify: jest.Mock };
  let jwtService: {
    signAsync: jest.Mock;
    decode: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let refreshRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };

  const publicUser = {
    id: 'user-id',
    email: 'a@b.com',
    name: 'A',
    phone: null,
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    userService = {
      findByEmail: jest.fn(),
      findEntityById: jest.fn(),
      toPublicUser: jest.fn().mockReturnValue(publicUser),
    };
    passwordHasher = { verify: jest.fn() };
    jwtService = {
      signAsync: jest.fn(),
      decode: jest.fn(),
      verifyAsync: jest.fn(),
    };
    refreshRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      findOne: jest.fn(),
      update: jest.fn(),
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

    const result = await service.login({
      email: 'a@b.com',
      password: 'secret1',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.tokenType).toBe('Bearer');
    expect(refreshRepo.save).toHaveBeenCalled();
  });

  it('rotates refresh and revokes the previous row', async () => {
    const jti = '11111111-1111-4111-8111-111111111111';
    const familyId = '22222222-2222-4222-8222-222222222222';
    const raw = 'refresh-token';
    const existing = {
      jti,
      familyId,
      tokenHash: hashToken(raw),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      replacedByJti: null,
    };

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      role: UserRole.USER,
      typ: 'refresh',
      jti,
    });
    refreshRepo.findOne.mockResolvedValue(existing);
    userService.findEntityById.mockResolvedValue({
      id: 'user-id',
      role: UserRole.USER,
    });
    jwtService.signAsync
      .mockResolvedValueOnce('new-access')
      .mockResolvedValueOnce('new-refresh');
    jwtService.decode.mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    });

    const result = await service.refresh(raw);

    expect(existing.revokedAt).toBeInstanceOf(Date);
    expect(existing.replacedByJti).toBeDefined();
    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
  });

  it('revokes the family when a revoked refresh is reused', async () => {
    const jti = '11111111-1111-4111-8111-111111111111';
    const familyId = '22222222-2222-4222-8222-222222222222';
    const raw = 'refresh-token';

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      role: UserRole.USER,
      typ: 'refresh',
      jti,
    });
    refreshRepo.findOne.mockResolvedValue({
      jti,
      familyId,
      tokenHash: hashToken(raw),
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(service.refresh(raw)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(refreshRepo.update).toHaveBeenCalled();
  });

  it('logout revoke is best-effort and never throws', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('bad'));
    await expect(service.logout('not-a-token')).resolves.toBeUndefined();
  });
});
