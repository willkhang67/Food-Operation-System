"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import AuthModal, { type AuthMode } from "@/components/auth/AuthModal";
import styles from "./Header.module.scss";

export default function Header() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

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
              className={styles.logoImage}
            />
          </div>
        </Link>

        <div className={styles.actions}>
          <button
            type="button"
            className={cn(styles.button, styles.login)}
            onClick={() => setAuthMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={cn(styles.button, styles.signup)}
            onClick={() => setAuthMode("signup")}
          >
            Sign up
          </button>
        </div>
      </div>

      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitchMode={setAuthMode}
        />
      )}
    </header>
  );
}