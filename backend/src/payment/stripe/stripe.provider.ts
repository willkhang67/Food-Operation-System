import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/** DI token — inject with @Inject(STRIPE_CLIENT) */
export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export const StripeProvider: Provider = {
  provide: STRIPE_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Stripe => {
    const secretKey = config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    return new Stripe(secretKey, {
      // Must match installed stripe package (22.3.x)
      apiVersion: '2026-07-29.dahlia',
    });
  },
};
