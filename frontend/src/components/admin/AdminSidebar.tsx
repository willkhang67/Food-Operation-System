"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UtensilsCrossed, Tags } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./AdminSidebar.module.scss";

const NAV_ITEMS = [
  { href: "/admin", label: "Food", icon: UtensilsCrossed },
  { href: "/admin/categories", label: "Category", icon: Tags },
] as const;

export default function AdminSidebar() {
  const pathname = usePathname();

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
        {/* TODO: thay bằng thông tin user thật khi có auth */}
        <span className={styles.loggedInAsLabel}>LOGGED IN AS</span>
        <span className={styles.loggedInAsValue}>Chưa đăng nhập</span>
      </div>
    </aside>
  );
}
