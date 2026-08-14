/** Mirrors the API's OrderStatus enum. */
export type OrderStatus = "pending" | "paid" | "processing" | "delivered" | "cancelled";

/** Mirrors the API's PaymentStatus enum. */
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "expired";

export interface OrderItem {
  id: string;
  foodId: string;
  foodName: string;
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
