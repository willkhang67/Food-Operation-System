export class CheckoutResponseDto {
  checkoutUrl!: string;
  sessionId!: string;
  /** Local Payment.id for this attempt (not the order id). */
  paymentId!: string;
}
