import type { ReactNode } from "react";
import styles from "./checkout.module.scss";

export type CheckoutTone = "positive" | "neutral" | "negative";

interface CheckoutPanelProps {
  tone: CheckoutTone;
  title: string;
  description: string;
  children?: ReactNode;
}

/** Shared shell for the pages Stripe returns the customer to. */
export default function CheckoutPanel({
  tone,
  title,
  description,
  children,
}: CheckoutPanelProps) {
  return (
    <main className={styles.panel}>
      <span className={`${styles.badge} ${styles[tone]}`} aria-hidden="true" />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {children}
    </main>
  );
}
