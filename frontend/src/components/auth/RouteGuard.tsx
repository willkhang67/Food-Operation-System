"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useAuthDialog } from "@/providers/AuthDialogProvider";
import { useAuth } from "@/providers/AuthProvider";
import type { UserRole } from "@/types";
import styles from "./RouteGuard.module.scss";

const ROLE_LABELS: Record<UserRole, string> = {
  user: "customers",
  staff: "kitchen staff",
  admin: "administrators",
};

function describeRoles(roles: UserRole[]): string {
  const labels = roles.map((role) => ROLE_LABELS[role]);
  if (labels.length <= 1) return labels[0] ?? "authorised users";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

interface PanelProps {
  title: string;
  description: string;
  children?: ReactNode;
}

function Panel({ title, description, children }: PanelProps) {
  return (
    <main className={styles.panel}>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
      {children && <div className={styles.actions}>{children}</div>}
    </main>
  );
}

interface RouteGuardProps {
  children: ReactNode;
  /** Omit to allow any signed-in user. */
  roles?: UserRole[];
}

/**
 * Soft UI guard. Not a security boundary: Nest enforces the real rules.
 *
 * Protected pages that use this must be Client Components. A Server Component
 * parent would render `children` into the RSC payload before this guard could
 * refuse them, which leaks page content to visitors who are not allowed in.
 */
export default function RouteGuard({ children, roles }: RouteGuardProps) {
  const { status, user, reload } = useAuth();
  const { openAuth } = useAuthDialog();

  if (status === "loading") {
    return <Panel title="Checking your access…" description="One moment." />;
  }

  if (status === "unavailable") {
    return (
      <Panel
        title="Cannot reach the server"
        description="We could not confirm your session. This is usually temporary."
      >
        <button
          type="button"
          className={cn(styles.button, styles.primary)}
          onClick={() => void reload()}
        >
          Try again
        </button>
      </Panel>
    );
  }

  if (!user) {
    return (
      <Panel title="Please sign in" description="You need an account to view this page.">
        <button
          type="button"
          className={cn(styles.button, styles.primary)}
          onClick={() => openAuth("login")}
        >
          Log in
        </button>
        <button
          type="button"
          className={cn(styles.button, styles.secondary)}
          onClick={() => openAuth("signup")}
        >
          Sign up
        </button>
      </Panel>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <Panel
        title="You do not have access"
        description={`This area is for ${describeRoles(roles)}.`}
      />
    );
  }

  return <>{children}</>;
}
