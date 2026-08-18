import type { OrderStatus } from "@/types";

/** Selects the badge treatment; the palette stays black / white / grey. */
export type OrderStatusTone = "waiting" | "positive" | "active" | "settled" | "cancelled";

interface OrderStatusCopy {
  label: string;
  /** What happens next, from the customer's side rather than the schema's. */
  detail: string;
  tone: OrderStatusTone;
}

/**
 * Customer-facing copy for the API's OrderStatus enum.
 *
 * A total Record rather than a lookup with a fallback: if the API gains a
 * status, this stops compiling instead of quietly rendering an empty badge on
 * someone's order. The mapping is deliberate because the schema's word is not
 * always the customer's — "pending" reads as "we are working on it" to most
 * people, when it actually means nothing has been charged yet.
 */
export const ORDER_STATUS_COPY: Record<OrderStatus, OrderStatusCopy> = {
  pending: {
    label: "Awaiting payment",
    detail: "Nothing has been charged yet.",
    tone: "waiting",
  },
  paid: {
    label: "Paid",
    detail: "Payment confirmed — the kitchen has your order.",
    tone: "positive",
  },
  processing: {
    label: "Being prepared",
    detail: "The kitchen is working on it now.",
    tone: "active",
  },
  delivered: {
    label: "Completed",
    detail: "This order is finished.",
    tone: "settled",
  },
  cancelled: {
    label: "Cancelled",
    detail: "No payment was taken for this order.",
    tone: "cancelled",
  },
};

/**
 * Whether checkout can still be started for an order. Mirrors the API,
 * which refuses `POST /payment/checkout/:id` from any other status — so this is
 * a way to avoid offering a button that cannot work, never a substitute for it.
 */
export function isPayable(status: OrderStatus): boolean {
  return status === "pending";
}
