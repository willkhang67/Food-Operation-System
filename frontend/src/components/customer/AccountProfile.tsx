"use client";

import type { AuthUser } from "@/types";
import styles from "./AccountProfile.module.scss";

/**
 * The visitor's own locale. Safe to build at module scope because AuthProvider
 * resolves the session in the browser, so this never renders on the server and
 * there is no server formatting for the client to disagree with.
 */
const MEMBER_SINCE_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatMemberSince(iso: string): string {
  const joined = new Date(iso);
  return Number.isNaN(joined.getTime()) ? "Date unavailable" : MEMBER_SINCE_FORMAT.format(joined);
}

interface AccountProfileProps {
  user: AuthUser;
}

/**
 * Read-only view of the account. `AuthUser` is the API's public user shape and
 * carries no credentials, so there is nothing here that needs masking.
 */
export default function AccountProfile({ user }: AccountProfileProps) {
  return (
    <dl className={styles.fields}>
      <div className={styles.field}>
        <dt className={styles.label}>Name</dt>
        <dd className={styles.value}>{user.name}</dd>
      </div>

      <div className={styles.field}>
        <dt className={styles.label}>Email</dt>
        <dd className={styles.value}>{user.email}</dd>
      </div>

      <div className={styles.field}>
        <dt className={styles.label}>Phone</dt>
        <dd className={user.phone ? styles.value : styles.missing}>
          {user.phone ?? "Not provided"}
        </dd>
      </div>

      <div className={styles.field}>
        <dt className={styles.label}>Member since</dt>
        <dd className={styles.value}>{formatMemberSince(user.createdAt)}</dd>
      </div>
    </dl>
  );
}
