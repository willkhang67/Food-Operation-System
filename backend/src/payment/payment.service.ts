import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe/stripe.provider';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  )
  {}
}
