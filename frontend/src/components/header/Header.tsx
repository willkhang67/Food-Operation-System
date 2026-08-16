"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAuth } from "@/providers/AuthProvider";
import { useAuthDialog } from "@/providers/AuthDialogProvider";
import styles from "./Header.module.scss";

function getRoleLabel(role?: string | null): string | null {
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export default function Header() {
  const { user, status, logout } = useAuth();
  const { openAuth } = useAuthDialog();
  const router = useRouter();

  const roleLabel = getRoleLabel(user?.role);
  const isLoggedIn = status === "authenticated" && !!user;

  const handleLogout = async () => {
    await logout();
    router.push("/customer");
  };

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
              sizes="(min-width: 48rem) 800px, 640px"
              className={styles.logoImage}
            />
          </div>
        </Link>

        <div className={styles.actions}>
          {isLoggedIn ? (
            <>
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  Hi, {user.name ?? user.email ?? "User"}
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