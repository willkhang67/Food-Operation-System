"use client";

import type { ReactNode } from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import AdminSidebar from "@/components/admin/AdminSidebar";
import styles from "./AdminShell.module.scss";

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Admin chrome + soft UX gate. Nest `@Roles(ADMIN)` remains the real boundary.
 *
 * The whole shell (sidebar included) sits behind RouteGuard so refused visitors
 * never mount admin navigation. Layout stays a thin Server Component that only
 * delegates here — matching the kitchen page pattern from AGENTS.md.
 */
export default function AdminShell({ children }: AdminShellProps) {
  return (
    <RouteGuard roles={["admin"]}>
      <div className={styles.shell}>
        <AdminSidebar />
        <main className={styles.content}>{children}</main>
      </div>
    </RouteGuard>
  );
}
