"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/lib/error-message";
import { useAuthDialog } from "@/providers/AuthDialogProvider";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./Header.module.scss";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export default function Header() {
  const { status, user, logout } = useAuth();
  const { openAuth } = useAuthDialog();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleLogout() {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await logout();
    } catch (error) {
      setSignOutError(toErrorMessage(error, "Could not sign out."));
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/customer" className={styles.brand}>
          <div className={styles.logo}>
            <Image
              src="/main_logo/JJ Logo 1.png"
              alt="Jolly Jumbuk Lunch Bar"
              fill
              priority
              // The box is 136/168px wide but the image is scaled 4.7x inside
              // it, so request a source large enough to stay sharp.
              sizes="(min-width: 48rem) 800px, 640px"
              className={styles.logoImage}
            />
          </div>
        </Link>

        <div className={styles.actions}>
          {signOutError && (
            <span className={styles.actionError} role="alert">
              {signOutError}
            </span>
          )}

          {/* Placeholder until the session resolves, so the header never shows
              the wrong state and never changes width when it settles. */}
          {status === "loading" ? (
            <span className={styles.skeleton} aria-hidden="true" />
          ) : user ? (
            <>
              <span className={styles.userName}>Hi, {firstName(user.name)}</span>
              <button
                type="button"
                className={cn(styles.button, styles.login)}
                onClick={handleLogout}
                disabled={isSigningOut}
              >
                {isSigningOut ? "Signing out…" : "Log out"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={cn(styles.button, styles.login)}
                onClick={() => openAuth("login")}
              >
                Log in
              </button>
              <button
                type="button"
                className={cn(styles.button, styles.signup)}
                onClick={() => openAuth("signup")}
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
