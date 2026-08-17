"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  addToCart,
  clearCart,
  getCartSnapshot,
  getServerCartSnapshot,
  removeFromCart,
  removeManyFromCart,
  setCartQuantity,
  subscribeToCart,
} from "@/lib/cart-store";
import type { CartItem, CreateOrderItem, Food } from "@/types";

interface CartContextValue {
  items: readonly CartItem[];
  totalItems: number;
  /**
   * Client-side estimate from the display snapshot. Never present this as the
   * amount charged — the API prices the order and Stripe charges that.
   */
  estimatedTotal: number;
  add: (food: Food, quantity?: number) => void;
  setQuantity: (foodId: string, quantity: number) => void;
  remove: (foodId: string) => void;
  removeMany: (foodIds: readonly string[]) => void;
  clear: () => void;
  /** The only shape the API is given: ids and quantities, no prices. */
  toOrderItems: () => CreateOrderItem[];
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);

  if (!value) {
    throw new Error("useCart must be used inside <CartProvider>.");
  }

  return value;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);

  const { totalItems, estimatedTotal } = useMemo(
    () => ({
      totalItems: items.reduce((sum, line) => sum + line.quantity, 0),
      estimatedTotal: items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    }),
    [items],
  );

  const add = useCallback((food: Food, quantity = 1) => {
    addToCart(
      {
        foodId: food.id,
        name: food.name,
        unitPrice: food.price,
        imageUrl: food.images?.[0]?.url ?? null,
      },
      quantity,
    );
  }, []);

  const toOrderItems = useCallback(
    () => items.map(({ foodId, quantity }) => ({ foodId, quantity })),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        estimatedTotal,
        add,
        setQuantity: setCartQuantity,
        remove: removeFromCart,
        removeMany: removeManyFromCart,
        clear: clearCart,
        toOrderItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
