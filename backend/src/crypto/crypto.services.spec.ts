import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BlindIndexService } from './blind-index.service';
import { FieldEncryptionService } from './field-encryption.service';
import { PasswordHasherService } from './password-hasher.service';

const TEST_FIELD_KEY = Buffer.alloc(32, 1).toString('base64');
const TEST_BLIND_KEY = Buffer.alloc(32, 2).toString('base64');

describe('Crypto services', () => {
  let fieldEncryption: FieldEncryptionService;
  let blindIndex: BlindIndexService;
  let passwordHasher: PasswordHasherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              FIELD_ENCRYPTION_KEY: TEST_FIELD_KEY,
              BLIND_INDEX_KEY: TEST_BLIND_KEY,
            }),
          ],
        }),
      ],
      providers: [
        FieldEncryptionService,
        BlindIndexService,
        PasswordHasherService,
      ],
    }).compile();

    fieldEncryption = module.get(FieldEncryptionService);
    blindIndex = module.get(BlindIndexService);
    passwordHasher = module.get(PasswordHasherService);

    fieldEncryption.onModuleInit();
    blindIndex.onModuleInit();
  });

  it('encrypts and decrypts field values', () => {
    const encrypted = fieldEncryption.encrypt('Alice');
    expect(encrypted).not.toBe('Alice');
    expect(fieldEncryption.decrypt(encrypted)).toBe('Alice');
  });

  it('creates stable blind indexes for normalized emails', () => {
    const first = blindIndex.create(blindIndex.normalizeEmail('Alice@Example.com'));
    const second = blindIndex.create(blindIndex.normalizeEmail('alice@example.com'));
    expect(first).toBe(second);
  });

  it('hashes and verifies passwords', async () => {
    const hash = await passwordHasher.hash('secret123');
    expect(hash).not.toBe('secret123');
    await expect(passwordHasher.verify('secret123', hash)).resolves.toBe(true);
    await expect(passwordHasher.verify('wrong', hash)).resolves.toBe(false);
  });
});
