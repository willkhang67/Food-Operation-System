"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import OrderCard from "@/components/customer/OrderCard";
import { isAbortError, isApiError, orderApi, paymentApi } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { isPayable } from "@/lib/order-status";
import { useAuthDialog } from "@/providers/AuthDialogProvider";
import { useAuth } from "@/providers/AuthProvider";
import { ApiErrorCode, type Order } from "@/types";
import styles from "./orders.module.scss";

function OrderHistory() {
  const { openAuth } = useAuthDialog();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  /** Bumped to re-run the fetch, so the effect stays the only thing that reads. */
  const [reloadToken, setReloadToken] = useState(0);

  // Two separate failures, because they have different lifetimes. A load error
  // belongs to the fetch and is cleared by the next successful one. A refused
  // payment has to outlive the refetch it triggers — sharing one state meant the
  // refetch wiped the sentence explaining why the button did nothing.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payNotice, setPayNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // Nothing is set before the first await on purpose: touching state
    // synchronously here would render the list twice on every reload.
    async function load() {
      try {
        const mine = await orderApi.getMine({ signal });
        setOrders(mine);
        setLoadError(null);
      } catch (cause) {
        if (isAbortError(cause)) return;
        setLoadError(toErrorMessage(cause, "Could not load your orders."));
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [reloadToken]);

  /** Re-reads the list without touching either message. */
  function refetch() {
    setIsLoading(true);
    setReloadToken((token) => token + 1);
  }

  /** The customer asking for a clean look, so old action feedback goes away. */
  function refreshNow() {
    setPayNotice(null);
    refetch();
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

      // This list is a snapshot. Any of these means the API has moved on from
      // what is on screen, so re-read rather than argue with it.
      case ApiErrorCode.Conflict:
        setPayNotice("This order has already been paid for.");
        refetch();
        return;

      case ApiErrorCode.ValidationError:
      case ApiErrorCode.NotFound:
        setPayNotice("This order can no longer be paid for. Your orders have been updated.");
        refetch();
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

      // Same tab, matching the cart: a blocked popup would leave the customer
      // looking at an unchanged page, unsure whether they had paid.
      window.location.assign(checkoutUrl);
      // payingOrderId stays set — the page is navigating away, and releasing the
      // button now would invite a second checkout session for the same order.
    } catch (cause) {
      setPayingOrderId(null);
      reportPaymentFailure(cause);
    }
  }

  const hasUnpaid = orders?.some((order) => isPayable(order.status)) ?? false;
  const isFirstLoad = isLoading && orders === null;

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

      {/*
        The honest answer to webhook lag. Stripe returns the customer before the
        signed webhook necessarily lands, so an order can still read as unpaid
        for a second or two after paying. Saying so beats leaving them to guess.
      */}
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
        with empty state. Without it, an expired session recovered through the
        auth dialog would leave the previous customer's orders on screen.
      */}
      <OrderHistory key={user?.id ?? "anonymous"} />
    </RouteGuard>
  );
}
