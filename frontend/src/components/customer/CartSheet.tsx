"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { isApiError, menuApi, orderApi, paymentApi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/lib/error-message";
import { useAuthDialog } from "@/providers/AuthDialogProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useCart } from "@/providers/CartProvider";
import { ApiErrorCode, type CartItem } from "@/types";
import styles from "./CartSheet.module.scss";

interface CartSheetProps {
  onClose: () => void;
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function listNames(items: readonly CartItem[]): string {
  const names = items.map((item) => item.name);
  if (names.length <= 1) return names[0] ?? "An item";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export default function CartSheet({ onClose }: CartSheetProps) {
  const { items, totalItems, estimatedTotal, setQuantity, remove, removeMany, clear, toOrderItems } =
    useCart();
  const { user } = useAuth();
  const { openAuth } = useAuthDialog();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soldOutIds, setSoldOutIds] = useState<string[]>([]);

  /**
   * Held so a retry after a failed checkout pays for the order we already
   * created instead of leaving a trail of duplicate pending orders. Reopening
   * a Stripe session for the same order is supported — the API cancels the
   * previous attempt and records a new one.
   */
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  /**
   * Any edit invalidates a created order: it was priced for the previous
   * contents, so the next attempt has to start a fresh one.
   */
  function forgetCreatedOrder(foodId: string) {
    setCreatedOrderId(null);
    setSoldOutIds((current) => current.filter((id) => id !== foodId));
  }

  function changeQuantity(foodId: string, quantity: number) {
    forgetCreatedOrder(foodId);
    setQuantity(foodId, quantity);
  }

  function removeLine(foodId: string) {
    forgetCreatedOrder(foodId);
    remove(foodId);
  }

  function removeSoldOutLines() {
    setCreatedOrderId(null);
    setError(null);
    removeMany(soldOutIds);
    setSoldOutIds([]);
  }

  /**
   * The API refuses the whole order when any line is sold out and names the
   * offending ids, not the dishes. Re-reading the menu turns that into
   * something the customer can act on.
   */
  async function findUnavailableLines(): Promise<readonly CartItem[]> {
    try {
      const foods = await menuApi.getFoods();
      const available = new Set(foods.filter((food) => food.is_available).map((food) => food.id));

      return items.filter((line) => !available.has(line.foodId));
    } catch {
      // The re-check is a courtesy; fall back to the API's own message.
      return [];
    }
  }

  async function reportFailure(cause: unknown): Promise<void> {
    if (!isApiError(cause)) {
      setError(toErrorMessage(cause, "Could not start checkout. Please try again."));
      return;
    }

    switch (cause.code) {
      case ApiErrorCode.Unauthenticated:
        setError("Please sign in to place this order.");
        openAuth("login");
        return;

      case ApiErrorCode.ValidationError: {
        const unavailable = await findUnavailableLines();

        if (unavailable.length > 0) {
          setSoldOutIds(unavailable.map((line) => line.foodId));
          setError(
            `${listNames(unavailable)} ${unavailable.length === 1 ? "is" : "are"} no longer available.`,
          );
          return;
        }

        setError(cause.message);
        return;
      }

      case ApiErrorCode.Conflict:
        setError("This order has already been paid for. Check your orders for the receipt.");
        return;

      default:
        setError(cause.message);
    }
  }

  async function handleCheckout() {
    if (!user) {
      // The cart survives the detour: signing in and pressing Checkout again
      // finishes the job.
      openAuth("login");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const orderId = createdOrderId ?? (await orderApi.create(toOrderItems())).id;
      setCreatedOrderId(orderId);

      const { checkoutUrl } = await paymentApi.startCheckout(orderId);

      // Cleared only once Stripe holds a session. From here the pending order is
      // the record of intent and /customer/orders is where it is resumed, which
      // is why abandoning the payment page does not rebuild the cart.
      clear();

      // Leaves isSubmitting set on purpose: the page is navigating away, and
      // re-enabling the button would invite a second order.
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      await reportFailure(checkoutError);
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div className={styles.overlay} onMouseDown={onClose}>
      <section
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Your cart</h2>
            <p className={styles.subtitle}>
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close cart">
            &times;
          </button>
        </header>

        {items.length === 0 ? (
          <p className={styles.empty}>Your cart is empty. Add something from the menu.</p>
        ) : (
          <>
            <ul className={styles.lines}>
              {items.map((line) => {
                const isSoldOut = soldOutIds.includes(line.foodId);

                return (
                  <li
                    key={line.foodId}
                    className={cn(styles.line, isSoldOut && styles.lineSoldOut)}
                  >
                    <div className={styles.lineInfo}>
                      <p className={styles.lineName}>{line.name}</p>
                      <p className={styles.lineMeta}>
                        {formatMoney(line.unitPrice)} each
                        {isSoldOut && <span className={styles.soldOut}>Sold out</span>}
                      </p>
                      <button
                        type="button"
                        className={styles.removeLine}
                        onClick={() => removeLine(line.foodId)}
                        disabled={isSubmitting}
                      >
                        Remove
                      </button>
                    </div>

                    <div className={styles.lineControls}>
                      <div className={styles.stepper}>
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.foodId, line.quantity - 1)}
                          aria-label={`One less ${line.name}`}
                          disabled={isSubmitting}
                        >
                          &minus;
                        </button>
                        <span className={styles.quantity}>{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.foodId, line.quantity + 1)}
                          aria-label={`One more ${line.name}`}
                          disabled={isSubmitting}
                        >
                          +
                        </button>
                      </div>
                      <p className={styles.lineTotal}>
                        {formatMoney(line.unitPrice * line.quantity)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className={styles.footer}>
              {error && (
                <div className={styles.error} role="alert">
                  <p>{error}</p>
                  {soldOutIds.length > 0 && (
                    <button
                      type="button"
                      className={styles.errorAction}
                      onClick={removeSoldOutLines}
                    >
                      Remove sold-out items
                    </button>
                  )}
                </div>
              )}

              <div className={styles.summary}>
                <span>Estimated total</span>
                <span className={styles.summaryValue}>{formatMoney(estimatedTotal)}</span>
              </div>
              <p className={styles.disclaimer}>
                The amount you pay is confirmed on the payment page.
              </p>

              <button
                type="button"
                className={styles.checkout}
                onClick={() => void handleCheckout()}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Starting checkout…"
                  : user
                    ? `Checkout · ${formatMoney(estimatedTotal)}`
                    : "Sign in to checkout"}
              </button>

              <Link href="/customer/orders" className={styles.ordersLink} onClick={onClose}>
                View my orders
              </Link>
            </div>
          </>
        )}
      </section>
    </div>,
    document.body,
  );
}
