/** Mirrors the API's OrderStatus enum. */
export type OrderStatus = "pending" | "paid" | "processing" | "ready" | "cancelled";

/** Mirrors the API's PaymentStatus enum. */
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "expired";

/** Request body line for POST /order. Mirrors the API's CreateOrderItemDto. */
export interface CreateOrderItem {
  foodId: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  foodId: string;
  foodName: string;
  /** Minutes for one unit; snapped at order create from food.cook_time. */
  cookTime: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalItems: number;
  totalPrice: number;
  items: OrderItem[];
  /** ISO timestamp; null until paid (or on legacy rows). */
  estimatedReadyAt: string | null;
  /** ISO timestamp of payment confirmation; null until paid. */
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

/** Response of POST /payment/checkout/:orderId. */
export interface CheckoutSession {
  checkoutUrl: string;
  sessionId: string;
  /** Local Payment.id for this attempt, not the order id. */
  paymentId: string;
}
