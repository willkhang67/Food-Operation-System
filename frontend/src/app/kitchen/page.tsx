"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import PlaceholderPage from "@/components/common/PlaceholderPage";

/** Client page so refused visitors never receive the kitchen shell in the RSC payload. */
export default function KitchenPage() {
  return (
    <RouteGuard roles={["admin", "staff"]}>
      <PlaceholderPage
        title="Kitchen view"
        description="The live queue of orders waiting to be prepared, backed by the order/kitchen endpoint."
      />
    </RouteGuard>
  );
}
