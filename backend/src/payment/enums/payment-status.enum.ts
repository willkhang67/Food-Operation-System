export enum PaymentStatus {
  PENDING = 'pending',
  /** Successful charge — aligns with OrderStatus.PAID. */
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}