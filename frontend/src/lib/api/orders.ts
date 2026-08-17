import type { CheckoutSession, CreateOrderItem, Order } from "@/types";
import { apiFetch, type QueryOptions } from "./client";

export const orderApi = {
  getMine: (options?: QueryOptions) => apiFetch<Order[]>("/order/me", options),
  getOrder: (id: string, options?: QueryOptions) =>
    apiFetch<Order>(`/order/${encodeURIComponent(id)}`, options),
  /**
   * Turns the draft cart into a pending order. Only ids and quantities are
   * sent; the API resolves names, prices, and the total from its own records,
   * so a tampered or stale cart cannot change what is charged.
   */
  create: (items: CreateOrderItem[], options?: QueryOptions) =>
    apiFetch<Order>("/order", { ...options, method: "POST", body: { items } }),
};

export const paymentApi = {
  /**
   * Starts a Stripe Checkout session and returns the URL to redirect to. The
   * amount is computed by the API from the stored order, never sent from here.
   */
  startCheckout: (orderId: string, options?: QueryOptions) =>
    apiFetch<CheckoutSession>(`/payment/checkout/${encodeURIComponent(orderId)}`, {
      ...options,
      method: "POST",
    }),
};
