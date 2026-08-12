import type { Metadata } from "next";
import { Suspense } from "react";
import CheckoutPanel from "../CheckoutPanel";
import CheckoutSuccess from "./CheckoutSuccess";

export const metadata: Metadata = {
  title: "Payment received",
  // Return URLs carry order references and must never reach a search index.
  robots: { index: false, follow: false },
};

/** Reading the query string opts this page out of static rendering. */
export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <CheckoutPanel
          tone="neutral"
          title="Confirming your payment…"
          description="One moment."
        />
      }
    >
      <CheckoutSuccess />
    </Suspense>
  );
}
