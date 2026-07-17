import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlindIndexService } from '../crypto/blind-index.service';
import { FieldEncryptionService } from '../crypto/field-encryption.service';
import { PasswordHasherService } from '../crypto/password-hasher.service';
import { User } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
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
          useValue: { hash: jest.fn(), verify: jest.fn() },
        },
        {
          provide: FieldEncryptionService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn() },
        },
        {
          provide: BlindIndexService,
          useValue: {
            normalizeEmail: jest.fn(),
            create: jest.fn(),
            matches: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
