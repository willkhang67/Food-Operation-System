import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CheckoutResponseDto } from './dto/checkout-response.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** Start a Stripe Checkout session for one of the caller's pending orders. */
  @Post('checkout/:orderId')
  @UseGuards(JwtAuthGuard)
  createCheckout(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<CheckoutResponseDto> {
    return this.paymentService.createCheckoutSession(orderId, user.id);
  }

  /**
   * Stripe webhook. No JWT: authentication is the signature check against
   * the raw body. Throttling is skipped so Stripe retries are never dropped.
   */
  @Post('webhook')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    if (!req.rawBody) {
      // Requires NestFactory.create(AppModule, { rawBody: true }).
      throw new BadRequestException('Raw body is not available');
    }

    await this.paymentService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }

  /** Payment attempts for an order — owner or staff/admin. */
  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  findByOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<PaymentResponseDto[]> {
    return this.paymentService.findByOrderId(orderId, user.id, user.role);
  }
}
