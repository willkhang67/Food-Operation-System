"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAuth } from "@/providers/AuthProvider";
import styles from "./RoleNav.module.scss";

/** Admin-only shortcuts between operational areas. Not shown to customers. */
const ADMIN_AREAS = [
  { href: "/customer", label: "CUSTOMER" },
  { href: "/kitchen", label: "KITCHEN" },
  { href: "/admin", label: "ADMIN" },
] as const;

/**
 * Demo role switcher — admin UX only.
 *
 * Hidden from visitors and signed-in customers so the public shell looks like
 * a product, not a dev playground. Nest still enforces roles on every API call;
 * hiding this bar does not grant access to /kitchen or /admin.
 */
export default function RoleNav() {
  const pathname = usePathname();
  const { user, status } = useAuth();

  if (status === "loading") return null;
  if (user?.role !== "admin") return null;

  return (
    <nav className={styles.nav} aria-label="Admin area switcher">
      {ADMIN_AREAS.map((area) => {
        const isActive = pathname === area.href || pathname.startsWith(`${area.href}/`);
        return (
          <Link
            key={area.href}
            href={area.href}
            className={cn(styles.link, isActive && styles.active)}
          >
            {area.label}
          </Link>
        );
      })}
    </nav>
  );
}
