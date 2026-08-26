"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import { isAbortError, orderApi } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/AuthProvider";
import type { Order, OrderStatus } from "@/types";
import CheckoutPanel from "../CheckoutPanel";
import styles from "../checkout.module.scss";

/**
 * Stripe redirects the customer back the moment it accepts the card, but the
 * webhook that marks the order paid is a separate call that can land a second
 * or two later. So the first read may still say "pending", and we poll briefly
 * before giving up rather than telling the customer something went wrong.
 */
const POLL_INTERVAL_MS = 2_000;
const CONFIRM_TIMEOUT_MS = 20_000;

const SETTLED_STATUSES: OrderStatus[] = ["paid", "processing", "ready", "cancelled"];

function OrdersLink({ variant }: { variant: "primary" | "secondary" }) {
  return (
    <Link href="/customer/orders" className={`${styles.button} ${styles[variant]}`}>
      View my orders
    </Link>
  );
}

function OrderSummary({ order }: { order: Order }) {
  return (
    <div className={styles.summary}>
      <div className={styles.summaryRow}>
        <span>Order</span>
        <span className={`${styles.summaryValue} ${styles.reference}`}>{order.id}</span>
      </div>
      <div className={styles.summaryRow}>
        <span>Items</span>
        <span className={styles.summaryValue}>{order.totalItems}</span>
      </div>
      <div className={styles.summaryRow}>
        <span>Total</span>
        <span className={styles.summaryValue}>${order.totalPrice.toFixed(2)}</span>
      </div>
    </div>
  );
}

function ConfirmedOrder({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll(): Promise<void> {
      try {
        const next = await orderApi.getOrder(orderId, { signal: controller.signal });
        if (controller.signal.aborted) return;

        setOrder(next);

        if (!SETTLED_STATUSES.includes(next.status) && Date.now() < deadline) {
          timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
          return;
        }

        // Webhook (or timeout) settled — orders list must not keep a stale pending row.
        if (user) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine(user.id) });
        }

        setIsConfirming(false);
      } catch (pollError) {
        if (isAbortError(pollError)) return;

        setError(toErrorMessage(pollError, "We could not confirm this order."));
        setIsConfirming(false);
      }
    }

    void poll();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orderId, queryClient, user]);

  if (error) {
    return (
      <CheckoutPanel tone="neutral" title="We could not confirm this order" description={error}>
        <div className={styles.actions}>
          <OrdersLink variant="primary" />
        </div>
      </CheckoutPanel>
    );
  }

  if (isConfirming) {
    return (
      <CheckoutPanel
        tone="neutral"
        title="Confirming your payment…"
        description="This usually takes a couple of seconds. You can safely stay on this page."
      />
    );
  }

  if (order?.status === "cancelled") {
    return (
      <CheckoutPanel
        tone="negative"
        title="This order was cancelled"
        description="No payment has been taken. Start a new order whenever you are ready."
      >
        <OrderSummary order={order} />
        <div className={styles.actions}>
          <Link href="/customer" className={`${styles.button} ${styles.primary}`}>
            Back to menu
          </Link>
          <OrdersLink variant="secondary" />
        </div>
      </CheckoutPanel>
    );
  }

  if (order && order.status !== "pending") {
    return (
      <CheckoutPanel
        tone="positive"
        title="Payment received"
        description="Thanks — the kitchen has your order."
      >
        <OrderSummary order={order} />
        <div className={styles.actions}>
          <OrdersLink variant="primary" />
        </div>
      </CheckoutPanel>
    );
  }

  // Settled into neither state within the window: the webhook is late or Stripe
  // declined without telling us. Claiming success here would be a lie.
  return (
    <CheckoutPanel
      tone="neutral"
      title="Still confirming your payment"
      description="Your bank has not confirmed this yet. It will appear in your orders as soon as it does — there is no need to pay again."
    >
      {order && <OrderSummary order={order} />}
      <div className={styles.actions}>
        <OrdersLink variant="primary" />
      </div>
    </CheckoutPanel>
  );
}

/**
 * The page Stripe returns a paying customer to.
 *
 * The query string is written by Stripe and is trivially forgeable, so it is
 * treated as a pointer and nothing more: the only thing that decides whether an
 * order is paid is the API, which is driven by the signed webhook. Reaching
 * this URL by hand shows an unpaid order, not a receipt.
 */
export default function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return (
      <CheckoutPanel
        tone="neutral"
        title="Thanks for your payment"
        description="We are processing it now. Your order will show as paid in your order history once your bank confirms it."
      >
        <div className={styles.actions}>
          <OrdersLink variant="primary" />
        </div>
      </CheckoutPanel>
    );
  }

  // Reading the order requires the customer's own session, and the API checks
  // that the order belongs to them.
  return (
    <RouteGuard>
      <ConfirmedOrder orderId={orderId} />
    </RouteGuard>
  );
}
