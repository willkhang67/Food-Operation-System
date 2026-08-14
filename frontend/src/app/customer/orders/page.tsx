"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import PlaceholderPage from "@/components/common/PlaceholderPage";

/** Client page so refused visitors never receive the orders shell in the RSC payload. */
export default function OrdersPage() {
  return (
    <RouteGuard>
      <PlaceholderPage
        title="Your orders"
        description="Your order history will appear here."
        width="mobile"
      />
    </RouteGuard>
  );
}
