"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./BottomNav.module.scss";

const TABS = [
  { href: "/customer", label: "Menu", icon: LayoutGrid },
  { href: "/customer/orders", label: "Orders", icon: ClipboardList },
  { href: "/customer/account", label: "Account", icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} className={cn(styles.tab, isActive && styles.active)}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={styles.label}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
