"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import PlaceholderPage from "@/components/common/PlaceholderPage";

/** Client page so refused visitors never receive the account shell in the RSC payload. */
export default function AccountPage() {
  return (
    <RouteGuard>
      <PlaceholderPage
        title="Account"
        description="Your profile and contact details will appear here."
        width="mobile"
      />
    </RouteGuard>
  );
}
