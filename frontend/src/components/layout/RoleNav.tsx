"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import styles from "./RoleNav.module.scss";

const ROLES = [
  { href: "/demo", label: "DEMO" },
  { href: "/customer", label: "CUSTOMER" },
  { href: "/kitchen", label: "KITCHEN" },
  { href: "/admin", label: "ADMIN" },
] as const;

export default function RoleNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {ROLES.map((role) => {
        const isActive = pathname === role.href || pathname.startsWith(`${role.href}/`);
        return (
          <Link
            key={role.href}
            href={role.href}
            className={cn(styles.link, isActive && styles.active)}
          >
            {role.label}
          </Link>
        );
      })}
    </nav>
  );
}
