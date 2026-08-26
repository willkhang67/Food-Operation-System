"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import RouteGuard from "@/components/auth/RouteGuard";
import OrderCard from "@/components/customer/OrderCard";
import { isApiError, orderApi, paymentApi } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { isPayable } from "@/lib/order-status";
import { queryKeys } from "@/lib/query-keys";
import { useAuthDialog } from "@/providers/AuthDialogProvider";
import { useAuth } from "@/providers/AuthProvider";
import { ApiErrorCode, type Order } from "@/types";
import styles from "./orders.module.scss";

interface OrderHistoryProps {
  userId: string;
}

function OrderHistory({ userId }: OrderHistoryProps) {
  const { openAuth } = useAuthDialog();
  const queryClient = useQueryClient();

  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  // Payment refusals must outlive a refetch — sharing state with loadError used
  // to wipe the explanation when the list reloaded.
  const [payNotice, setPayNotice] = useState<string | null>(null);

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.mine(userId),
    queryFn: ({ signal }) => orderApi.getMine({ signal }),
    // Orders change after Stripe webhooks; stay fresh when the tab is focused.
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const orders = ordersQuery.data ?? null;
  const isLoading = ordersQuery.isFetching;
  const isFirstLoad = ordersQuery.isPending && orders === null;
  const loadError = ordersQuery.error
    ? toErrorMessage(ordersQuery.error, "Could not load your orders.")
    : null;

  function refreshNow() {
    setPayNotice(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine(userId) });
  }

  function reportPaymentFailure(cause: unknown) {
    if (!isApiError(cause)) {
      setPayNotice(toErrorMessage(cause, "Could not start checkout. Please try again."));
      return;
    }

    switch (cause.code) {
      case ApiErrorCode.Unauthenticated:
        setPayNotice("Your session has expired. Please sign in again to pay for this order.");
        openAuth("login");
        return;

      case ApiErrorCode.Conflict:
        setPayNotice("This order has already been paid for.");
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine(userId) });
        return;

      case ApiErrorCode.ValidationError:
      case ApiErrorCode.NotFound:
        setPayNotice("This order can no longer be paid for. Your orders have been updated.");
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine(userId) });
        return;

      default:
        setPayNotice(cause.message);
    }
  }

  async function payNow(order: Order) {
    setPayingOrderId(order.id);
    setPayNotice(null);

    try {
      const { checkoutUrl } = await paymentApi.startCheckout(order.id);

      window.location.assign(checkoutUrl);
    } catch (cause) {
      setPayingOrderId(null);
      reportPaymentFailure(cause);
    }
  }

  const hasUnpaid = orders?.some((order) => isPayable(order.status)) ?? false;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Your orders</h1>
          <p className={styles.subtitle}>Newest first.</p>
        </div>
        <button type="button" className={styles.refresh} onClick={refreshNow} disabled={isLoading}>
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {(payNotice || loadError) && (
        <div className={styles.alerts} role="alert">
          {payNotice && <p className={styles.error}>{payNotice}</p>}
          {loadError && <p className={styles.error}>{loadError}</p>}
        </div>
      )}

      {isFirstLoad && <p className={styles.status}>Loading your orders…</p>}

      {hasUnpaid && (
        <p className={styles.hint}>
          Just paid for something? Confirmation can take a few seconds — press Refresh.
        </p>
      )}

      {orders?.length === 0 && !isLoading && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>You have not placed an order yet.</p>
          <Link href="/customer" className={styles.emptyLink}>
            Browse the menu
          </Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className={styles.list}>
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isPaying={payingOrderId === order.id}
              onPayNow={isPayable(order.status) ? () => void payNow(order) : undefined}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

/**
 * The guarded content is built inside this Client Component rather than passed
 * in from the page, so an unauthorised visitor never receives the order list in
 * the RSC payload. The API scopes `GET /order/me` to the caller's own id, which
 * is the boundary that actually matters.
 */
export default function MyOrders() {
  const { user } = useAuth();

  return (
    <RouteGuard>
      {/*
        Keyed by account so that signing in as someone else in this tab remounts
        with empty state. Query keys also include userId — belt and braces.
      */}
      {user ? <OrderHistory key={user.id} userId={user.id} /> : null}
    </RouteGuard>
  );
}
