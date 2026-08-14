"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import AuthModal, { type AuthMode } from "@/components/auth/AuthModal";
import { api } from "@/lib/api";
import styles from "./Header.module.scss";

interface AuthUser {
  [key: string]: unknown;
}

function getRoleLabel(user: AuthUser | null): string | null {
  if (!user) return null;
  const role = user["role"];
  if (typeof role !== "string" || !role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export default function Header() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const handleLogoutEvent = () => setUser(null);
    const handleLoginEvent = () => setUser(api.getUser());

    window.addEventListener("auth:logout", handleLogoutEvent);
    window.addEventListener("auth:login", handleLoginEvent);
    return () => {
      window.removeEventListener("auth:logout", handleLogoutEvent);
      window.removeEventListener("auth:login", handleLoginEvent);
    };
  }, []);

  useEffect(() => {
    const savedUser = api.getUser();
    if (savedUser) setUser(savedUser);
  }, []);

  const handleLoginSuccess = (userData: AuthUser) => {
    setUser(userData);
  };

  const handleLogout = () => {
    api.clearAuthData();
    setUser(null);
  };

  const roleLabel = getRoleLabel(user);

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
          {user ? (
            <>
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  Hi, {(user.name as string) || (user.email as string) || "User"}
                </span>
                {roleLabel && <span className={styles.userRole}>{roleLabel}</span>}
              </div>
              <button
                type="button"
                className={cn(styles.button, styles.logout)}
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitchMode={setAuthMode}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </header>
  );
}