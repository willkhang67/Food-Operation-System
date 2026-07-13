import {
  Injectable,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

@Injectable()
export class FieldEncryptionService implements OnModuleInit {
  private key: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const raw = this.config.get<string>('FIELD_ENCRYPTION_KEY');
    if (!raw) {
      throw new InternalServerErrorException(
        'FIELD_ENCRYPTION_KEY is not configured',
      );
    }

    const key = Buffer.from(raw, 'base64');
    if (key.length !== KEY_LENGTH) {
      throw new InternalServerErrorException(
        'FIELD_ENCRYPTION_KEY must be 32 bytes (base64-encoded)',
      );
    }

    this.key = key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, ciphertext, authTag]).toString('base64');
  }

  decrypt(blob: string): string {
    const buffer = Buffer.from(blob, 'base64');
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(buffer.length - AUTH_TAG_LENGTH);
    const ciphertext = buffer.subarray(
      IV_LENGTH,
      buffer.length - AUTH_TAG_LENGTH,
    );

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
