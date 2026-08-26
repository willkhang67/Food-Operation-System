"use client";

import { cn } from "@/lib/cn";
import { getKitchenCountdown } from "@/lib/kitchen-eta";
import { ORDER_STATUS_COPY } from "@/lib/order-status";
import type { Order } from "@/types";
import styles from "./KitchenOrderCard.module.scss";

const PLACED_AT_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function formatPlacedAt(iso: string): string {
  const placedAt = new Date(iso);
  return Number.isNaN(placedAt.getTime()) ? "—" : PLACED_AT_FORMAT.format(placedAt);
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

interface KitchenOrderCardProps {
  order: Order;
  nowMs: number;
  isMarkingReady: boolean;
  onMarkReady: () => void;
  actionError: string | null;
}

export default function KitchenOrderCard({
  order,
  nowMs,
  isMarkingReady,
  onMarkReady,
  actionError,
}: KitchenOrderCardProps) {
  const { label, tone } = ORDER_STATUS_COPY[order.status];
  const countdown = getKitchenCountdown(order.estimatedReadyAt, nowMs);
  const canMarkReady = order.status === "paid" || order.status === "processing";

  return (
    <li
      className={cn(styles.card, countdown.overdue && styles.overdue)}
      data-overdue={countdown.overdue ? "true" : undefined}
    >
      <div className={styles.head}>
        <span className={cn(styles.badge, styles[tone])}>{label}</span>
        <time className={styles.placedAt} dateTime={order.paidAt ?? order.createdAt}>
          Paid {formatPlacedAt(order.paidAt ?? order.createdAt)}
        </time>
      </div>

      <p
        className={cn(styles.countdown, countdown.overdue && styles.countdownOverdue)}
        aria-live="polite"
      >
        {countdown.label}
      </p>

      <ul className={styles.items}>
        {order.items.map((item) => (
          <li key={item.id}>
            <span className={styles.qty}>{item.quantity}×</span> {item.foodName}
          </li>
        ))}
      </ul>

      <div className={styles.foot}>
        <span>
          {order.totalItems} {order.totalItems === 1 ? "item" : "items"}
        </span>
        <span>{formatMoney(order.totalPrice)}</span>
      </div>

      <p className={styles.reference}>Ref {order.id.slice(0, 8)}</p>

      {actionError && (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      )}

      {canMarkReady && (
        <button
          type="button"
          className={styles.readyBtn}
          onClick={onMarkReady}
          disabled={isMarkingReady}
        >
          {isMarkingReady ? "Updating…" : "Mark ready"}
        </button>
      )}
    </li>
  );
}
