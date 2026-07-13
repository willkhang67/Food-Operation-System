import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlindIndexService } from '../crypto/blind-index.service';
import { FieldEncryptionService } from '../crypto/field-encryption.service';
import { PasswordHasherService } from '../crypto/password-hasher.service';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          } satisfies Partial<Repository<User>>,
        },
        {
          provide: PasswordHasherService,
          useValue: {
            hash: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: FieldEncryptionService,
          useValue: {
            encrypt: jest.fn((value: string) => `enc:${value}`),
            decrypt: jest.fn((value: string) => value.replace('enc:', '')),
          },
        },
        {
          provide: BlindIndexService,
          useValue: {
            normalizeEmail: jest.fn((email: string) => email.toLowerCase()),
            create: jest.fn((value: string) => `idx:${value}`),
            matches: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
