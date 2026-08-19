"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UtensilsCrossed, Tags, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/providers/AuthProvider";
import type { AuthUser } from "@/types";
import styles from "./AdminSidebar.module.scss";

const NAV_ITEMS = [
  { href: "/admin", label: "Food", icon: UtensilsCrossed },
  { href: "/admin/categories", label: "Category", icon: Tags },
] as const;

function getDisplayName(user: AuthUser | null): string {
  if (!user) return "Not logged in";
  return user.name ?? user.email ?? "Admin";
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/customer");
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.avatar}>JJ</div>
        <div>
          <p className={styles.brandName}>Jolly Jumbuk</p>
          <p className={styles.brandRole}>ADMIN</p>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(styles.navItem, isActive && styles.navItemActive)}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.loggedInAs}>
        <span className={styles.loggedInAsLabel}>LOGGED IN AS</span>
        <div className={styles.loggedInAsRow}>
          <span
            className={styles.loggedInAsValue}
            title={getDisplayName(user)}
          >
            {getDisplayName(user)}
          </span>
          {user && (
            <button
              type="button"
              className={styles.logoutButton}
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}