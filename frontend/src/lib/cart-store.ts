import type { CartItem } from "@/types";

/**
 * The cart lives in `sessionStorage`, exposed as an external store so React can
 * read it through `useSyncExternalStore`.
 *
 * Why not `useState` in a provider: the cart has to survive a reload, and
 * seeding state from storage inside an effect means the first paint shows an
 * empty cart and then jumps. `useSyncExternalStore` has a server snapshot for
 * exactly this, so hydration is correct by construction instead of by timing.
 *
 * Why session and not local: this is a lunch bar. Tabs are often shared
 * devices, and a cart that outlives the tab tends to come back holding
 * yesterday's sold-out items. Session scope loses nothing the customer would
 * miss and keeps stale state short-lived.
 */

const STORAGE_KEY = "jj_cart_v1";

/** Guard against a fat finger on the stepper turning into a 900-item order. */
const MAX_LINE_QUANTITY = 99;

/** `useSyncExternalStore` compares snapshots by reference, so empty is shared. */
const EMPTY: readonly CartItem[] = Object.freeze([]);

let snapshot: readonly CartItem[] = EMPTY;
let isHydrated = false;
const listeners = new Set<() => void>();

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Partial<CartItem>;

  return (
    typeof item.foodId === "string" &&
    typeof item.name === "string" &&
    typeof item.unitPrice === "number" &&
    Number.isFinite(item.unitPrice) &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    (typeof item.imageUrl === "string" || item.imageUrl === null)
  );
}

function readStorage(): readonly CartItem[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    // Every line is validated rather than trusted: this string is editable by
    // the user, and a malformed line would otherwise crash the cart sheet.
    const items = parsed.filter(isCartItem);

    return items.length > 0 ? Object.freeze(items) : EMPTY;
  } catch {
    // Blocked storage or a hand-edited value. A cart is disposable, so drop it
    // instead of taking the page down with it.
    return EMPTY;
  }
}

function writeStorage(items: readonly CartItem[]): void {
  try {
    if (items.length === 0) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Full or blocked storage costs persistence, not the current page's cart.
  }
}

/** Deferred so importing this module during SSR touches no browser API. */
function ensureHydrated(): void {
  if (isHydrated || typeof window === "undefined") return;

  isHydrated = true;
  snapshot = readStorage();
}

function commit(next: readonly CartItem[]): void {
  snapshot = next.length > 0 ? Object.freeze(next) : EMPTY;
  writeStorage(snapshot);

  for (const listener of listeners) listener();
}

function clampQuantity(quantity: number): number {
  return Math.min(Math.max(Math.floor(quantity), 1), MAX_LINE_QUANTITY);
}

export function subscribeToCart(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getCartSnapshot(): readonly CartItem[] {
  ensureHydrated();
  return snapshot;
}

/**
 * Used on the server and for the hydration render. Returning empty keeps the
 * server and client markup identical; React re-reads the real snapshot straight
 * after hydration.
 */
export function getServerCartSnapshot(): readonly CartItem[] {
  return EMPTY;
}

/** Adding an item already present refreshes its snapshot and bumps quantity. */
export function addToCart(item: Omit<CartItem, "quantity">, quantity = 1): void {
  ensureHydrated();

  const existing = snapshot.find((line) => line.foodId === item.foodId);

  const next = existing
    ? snapshot.map((line) =>
        line.foodId === item.foodId
          ? { ...line, ...item, quantity: clampQuantity(line.quantity + quantity) }
          : line,
      )
    : [...snapshot, { ...item, quantity: clampQuantity(quantity) }];

  commit(next);
}

export function setCartQuantity(foodId: string, quantity: number): void {
  ensureHydrated();

  if (quantity < 1) {
    removeFromCart(foodId);
    return;
  }

  commit(
    snapshot.map((line) =>
      line.foodId === foodId ? { ...line, quantity: clampQuantity(quantity) } : line,
    ),
  );
}

export function removeFromCart(foodId: string): void {
  ensureHydrated();
  commit(snapshot.filter((line) => line.foodId !== foodId));
}

export function removeManyFromCart(foodIds: readonly string[]): void {
  ensureHydrated();

  const dropped = new Set(foodIds);
  commit(snapshot.filter((line) => !dropped.has(line.foodId)));
}

export function clearCart(): void {
  ensureHydrated();
  commit(EMPTY);
}
