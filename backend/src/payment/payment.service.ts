import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { In, Repository } from 'typeorm';
import { Order } from '../order/entities/order.entity';
import { OrderStatus } from '../order/enums/order-status.enum';
import { OrderService } from '../order/order.service';
import { UserRole } from '../user/enums/user-role.enum';
import { CheckoutResponseDto } from './dto/checkout-response.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { STRIPE_CLIENT } from './stripe/stripe.provider';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly orderService: OrderService,

    private readonly config: ConfigService,
  ) {}

  //map payment entity to response dto
  private toResponseDto(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      provider: payment.provider,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Start a Stripe Checkout session for a pending order.
   *
   * Retry model (1 order : N payments): previous open attempts are
   * cancelled and every retry creates a NEW payment row, so failed or
   * abandoned attempts stay in the audit trail.
   */
  async createCheckoutSession(
    orderId: string,
    userId: string,
  ): Promise<CheckoutResponseDto> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { items: true },
    });
    
    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    // Ownership: users may only pay for their own orders (IDOR guard).
    if (order.userId !== userId) {
      throw new ForbiddenException('You can only pay for your own orders');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order cannot be paid from status "${order.status}"`,
      );
    }

    if (!order.items?.length) {
      throw new BadRequestException('Order has no items to pay for');
    }

    // Never double-charge: refuse if any attempt already succeeded.
    const paidAttempt = await this.paymentRepo.findOneBy({
      orderId,
      status: PaymentStatus.PAID,
    });
    if (paidAttempt) {
      throw new ConflictException('Order already has a successful payment');
    }

    // Close previous open attempts; the retry becomes a fresh row.
    await this.paymentRepo.update(
      { orderId, status: PaymentStatus.PENDING },
      { status: PaymentStatus.CANCELLED },
    );

    const currency = this.config.get<string>('STRIPE_CURRENCY', 'aud');
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    // Amounts come from the order snapshot (server-side), never the client.
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency,
          unit_amount: Math.round(Number(item.unitPrice) * 100),
          product_data: { name: item.foodName },
        },
      }));

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      // orderId lets the return page confirm this specific order. It is only a
      // pointer: GET /order/:id re-checks ownership, and the signed webhook is
      // what actually marks the order paid.
      success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=${order.id}`,
      cancel_url: `${frontendUrl}/checkout/cancel`,
      // Binds the webhook event back to our order without trusting the client.
      metadata: { orderId: order.id, userId: order.userId },
    });

    if (!session.url) {
      throw new BadRequestException('Stripe did not return a checkout URL');
    }

    const payment = this.paymentRepo.create({
      orderId: order.id,
      userId: order.userId,
      provider: 'stripe',
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : null,
      status: PaymentStatus.PENDING,
      amount: Number(order.totalPrice),
      currency,
    });
    const saved = await this.paymentRepo.save(payment);

    this.logger.log(
      `Checkout session created: payment=${saved.id} order=${order.id} session=${session.id}`,
    );

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      paymentId: saved.id,
    };
  }

  /**
   * Stripe webhook entry point. The signature is verified against the raw
   * request body; parsed JSON must never be used here.
   *
   * Idempotent: Stripe may deliver the same event more than once.
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      // Fail closed: without the secret we cannot trust any event.
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      throw new BadRequestException('Webhook is not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      // Do not leak verification details to the caller.
      this.logger.warn('Rejected webhook with invalid signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await this.handleCheckoutExpired(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
      default:
        this.logger.debug(`Ignoring webhook event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const payment = await this.paymentRepo.findOneBy({
      stripeCheckoutSessionId: session.id,
    });
    if (!payment) {
      // Ack the event (return 200) so Stripe stops retrying a session we
      // will never recognise; log it for investigation.
      this.logger.error(
        `No payment row for completed session ${session.id}; ignoring`,
      );
      return;
    }

    // Idempotency: duplicate deliveries must not re-run side effects.
    if (payment.status === PaymentStatus.PAID) {
      return;
    }

    // Defense-in-depth: the charged total must match our order snapshot.
    const expectedCents = Math.round(Number(payment.amount) * 100);
    if (
      session.amount_total !== null &&
      session.amount_total !== expectedCents
    ) {
      this.logger.error(
        `Amount mismatch for payment ${payment.id}: expected ${expectedCents}, got ${session.amount_total}`,
      );
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
      return;
    }

    payment.status = PaymentStatus.PAID;
    payment.stripePaymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : payment.stripePaymentIntentId;
    await this.paymentRepo.save(payment);

    // "Paid -> send to kitchen": order becomes visible in the kitchen queue.
    await this.orderService.markAsPaid(payment.orderId);

    this.logger.log(
      `Payment ${payment.id} paid; order ${payment.orderId} sent to kitchen`,
    );
  }

  private async handleCheckoutExpired(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const result = await this.paymentRepo.update(
      {
        stripeCheckoutSessionId: session.id,
        status: PaymentStatus.PENDING,
      },
      { status: PaymentStatus.EXPIRED },
    );
    if (result.affected) {
      this.logger.log(`Checkout session ${session.id} expired`);
    }
  }

  private async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const result = await this.paymentRepo.update(
      {
        stripePaymentIntentId: paymentIntent.id,
        status: In([PaymentStatus.PENDING]),
      },
      { status: PaymentStatus.FAILED },
    );
    if (result.affected) {
      this.logger.warn(`Payment intent ${paymentIntent.id} failed`);
    }
  }

  /** All attempts for an order (newest first). Owner or staff/admin only. */
  async findByOrderId(
    orderId: string,
    userId: string,
    role: UserRole,
  ): Promise<PaymentResponseDto[]> {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    const isStaffOrAdmin = role === UserRole.ADMIN || role === UserRole.STAFF;
    if (!isStaffOrAdmin && order.userId !== userId) {
      throw new ForbiddenException(
        'You can only view payments for your own orders',
      );
    }

    const payments = await this.paymentRepo.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
    return payments.map((payment) => this.toResponseDto(payment));
  }
}
