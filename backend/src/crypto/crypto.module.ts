import { Global, Module } from '@nestjs/common';
import { BlindIndexService } from './blind-index.service';
import { FieldEncryptionService } from './field-encryption.service';
import { PasswordHasherService } from './password-hasher.service';

@Global()
@Module({
  providers: [PasswordHasherService, FieldEncryptionService, BlindIndexService],
  exports: [PasswordHasherService, FieldEncryptionService, BlindIndexService],
})
export class CryptoModule {}
