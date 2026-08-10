"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import PlaceholderPage from "@/components/common/PlaceholderPage";

/**
 * Client page on purpose: a Server Component would render the children into the
 * RSC payload before RouteGuard could refuse them. Soft UI guards must not be
 * the only line of defence — Nest still enforces admin access on the API.
 */
export default function AdminPage() {
  return (
    <RouteGuard roles={["admin"]}>
      <PlaceholderPage
        title="Admin dashboard"
        description="Menu and category management will live here. The API already enforces admin-only access on these endpoints."
      />
    </RouteGuard>
  );
}
