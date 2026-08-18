"use client";

import { cn } from "@/lib/cn";
import { ORDER_STATUS_COPY } from "@/lib/order-status";
import type { Order } from "@/types";
import styles from "./OrderCard.module.scss";

/**
 * The visitor's own locale. Safe to build at module scope because this card
 * only ever renders from client-side data, so there is no server render whose
 * formatting could disagree with the browser's.
 */
const PLACED_AT_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function formatPlacedAt(iso: string): string {
  const placedAt = new Date(iso);
  return Number.isNaN(placedAt.getTime()) ? "Date unavailable" : PLACED_AT_FORMAT.format(placedAt);
}

/** Always the API's stored total, never a sum computed here. */
function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function describeItems(items: Order["items"]): string {
  return items.map((item) => `${item.quantity} × ${item.foodName}`).join(", ");
}

interface OrderCardProps {
  order: Order;
  isPaying: boolean;
  /** Omitted when the order's status means checkout would be refused. */
  onPayNow?: () => void;
}

export default function OrderCard({ order, isPaying, onPayNow }: OrderCardProps) {
  const { label, detail, tone } = ORDER_STATUS_COPY[order.status];

  return (
    <li className={styles.card}>
      <div className={styles.head}>
        <span className={cn(styles.badge, styles[tone])}>{label}</span>
        <time className={styles.placedAt} dateTime={order.createdAt}>
          {formatPlacedAt(order.createdAt)}
        </time>
      </div>

      <p className={styles.detail}>{detail}</p>

      {order.items.length > 0 && <p className={styles.items}>{describeItems(order.items)}</p>}

      <div className={styles.foot}>
        <span className={styles.count}>
          {order.totalItems} {order.totalItems === 1 ? "item" : "items"}
        </span>
        <span className={styles.total}>{formatMoney(order.totalPrice)}</span>
      </div>

      {/* Shown so a customer contacting the shop can quote something exact. */}
      <p className={styles.reference}>Ref {order.id}</p>

      {onPayNow && (
        <button type="button" className={styles.pay} onClick={onPayNow} disabled={isPaying}>
          {isPaying ? "Starting checkout…" : `Pay now · ${formatMoney(order.totalPrice)}`}
        </button>
      )}
    </li>
  );
}
