/**
 * Stable TanStack Query keys. Private data includes a session-bound segment
 * (`mine` + userId) so a shared browser never reuses another account's entry
 * under a generic key after login.
 *
 * Auth / CSRF / checkout mutations are intentionally absent — those must not
 * be cached.
 */
export const queryKeys = {
  menu: {
    all: ["menu"] as const,
    foods: ["menu", "foods"] as const,
    categories: ["menu", "categories"] as const,
  },
  orders: {
    all: ["orders"] as const,
    mine: (userId: string) => ["orders", "mine", userId] as const,
    kitchen: ["orders", "kitchen"] as const,
  },
} as const;
