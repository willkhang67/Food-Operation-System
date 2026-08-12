import type { Metadata } from "next";
import Link from "next/link";
import CheckoutPanel from "../CheckoutPanel";
import styles from "../checkout.module.scss";

export const metadata: Metadata = {
  title: "Payment cancelled",
  robots: { index: false, follow: false },
};

/**
 * Where Stripe sends a customer who backs out of the payment form. Nothing is
 * fetched: the order was never charged, so there is no state to confirm. The
 * order itself stays pending until the customer retries or cancels it.
 */
export default function CheckoutCancelPage() {
  return (
    <CheckoutPanel
      tone="negative"
      title="Payment cancelled"
      description="You have not been charged. Your order is still waiting for you."
    >
      <div className={styles.actions}>
        <Link href="/customer/orders" className={`${styles.button} ${styles.primary}`}>
          View my orders
        </Link>
        <Link href="/customer" className={`${styles.button} ${styles.secondary}`}>
          Back to menu
        </Link>
      </div>
    </CheckoutPanel>
  );
}
