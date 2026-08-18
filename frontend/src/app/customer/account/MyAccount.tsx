"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import PlaceholderPage from "@/components/common/PlaceholderPage";
import AccountProfile from "@/components/customer/AccountProfile";
import { toErrorMessage } from "@/lib/error-message";
import { useAuth } from "@/providers/AuthProvider";
import type { AuthUser } from "@/types";
import styles from "./account.module.scss";

interface AccountViewProps {
  user: AuthUser;
  isSigningOut: boolean;
  signOutError: string | null;
  onSignOut: () => void;
}

function AccountView({ user, isSigningOut, signOutError, onSignOut }: AccountViewProps) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Account</h1>
        <p className={styles.subtitle}>Signed in as {user.email}</p>
      </header>

      <section className={styles.card}>
        <AccountProfile user={user} />
        <p className={styles.note}>Need one of these changed? Ask us at the counter for now.</p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Your orders</h2>
        <p className={styles.sectionText}>
          Every order you place is kept against this account, including any still waiting to be
          paid for.
        </p>
        <Link href="/customer/orders" className={styles.primaryLink}>
          View my orders
        </Link>
      </section>

      {signOutError && (
        <p className={styles.error} role="alert">
          {signOutError}
        </p>
      )}

      <button
        type="button"
        className={styles.signOut}
        onClick={onSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? "Signing out…" : "Log out"}
      </button>
    </main>
  );
}

/**
 * Owns the sign-out flow deliberately, rather than leaving it to the guarded
 * view below. `RouteGuard` unmounts its children the instant the session ends,
 * so state living down there has nobody left to speak for it, and the visitor
 * is shown "Please sign in" as the reward for signing out.
 *
 * The guarded content is also built here rather than passed in from the page, so
 * a visitor without a session never receives another person's contact details in
 * the RSC payload. `GET /auth/me` is scoped to the caller's own token, which is
 * the boundary that actually matters.
 */
export default function MyAccount() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function signOut() {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await logout();
      router.push("/customer");
      // isSigningOut stays true: the route is already changing, and re-enabling
      // the button would offer a second sign-out for a session that is gone.
    } catch (cause) {
      setIsSigningOut(false);
      // AuthProvider only clears the session once the server confirms, so on
      // failure the visitor really is still signed in. Saying so is the honest
      // outcome; claiming otherwise would leave live cookies behind a UI that
      // insists they are gone.
      setSignOutError(toErrorMessage(cause, "Could not sign you out. Please try again."));
    }
  }

  // The session has ended and the redirect has not landed yet. Shows nothing
  // that needs guarding, and spares the visitor a sign-in prompt they did not
  // ask for.
  if (isSigningOut && !user) {
    return (
      <PlaceholderPage
        title="Signing you out…"
        description="Taking you back to the menu."
        width="mobile"
      />
    );
  }

  return (
    <RouteGuard>
      {user && (
        <AccountView
          user={user}
          isSigningOut={isSigningOut}
          signOutError={signOutError}
          onSignOut={() => void signOut()}
        />
      )}
    </RouteGuard>
  );
}
