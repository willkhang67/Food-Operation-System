export enum OrderStatus {
  PAID = 'paid',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  PROCESSING = 'processing',
  /** Food is ready for the customer (formerly "delivered"). */
  READY = 'ready',
}
