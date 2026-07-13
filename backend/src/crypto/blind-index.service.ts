import {
  Injectable,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

const KEY_LENGTH = 32;

@Injectable()
export class BlindIndexService implements OnModuleInit {
  private key: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const raw = this.config.get<string>('BLIND_INDEX_KEY');
    if (!raw) {
      throw new InternalServerErrorException(
        'BLIND_INDEX_KEY is not configured',
      );
    }

    const key = Buffer.from(raw, 'base64');
    if (key.length !== KEY_LENGTH) {
      throw new InternalServerErrorException(
        'BLIND_INDEX_KEY must be 32 bytes (base64-encoded)',
      );
    }

    this.key = key;
  }

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  create(value: string): string {
    return createHmac('sha256', this.key).update(value).digest('hex');
  }

  matches(value: string, index: string): boolean {
    const computed = Buffer.from(this.create(value), 'hex');
    const stored = Buffer.from(index, 'hex');

    if (computed.length !== stored.length) {
      return false;
    }

    return timingSafeEqual(computed, stored);
  }
}
