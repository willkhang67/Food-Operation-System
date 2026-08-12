import type { CheckoutSession, Order } from "@/types";
import { apiFetch, type QueryOptions } from "./client";

export const orderApi = {
  getMine: (options?: QueryOptions) => apiFetch<Order[]>("/order/me", options),
  getOrder: (id: string, options?: QueryOptions) =>
    apiFetch<Order>(`/order/${encodeURIComponent(id)}`, options),
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
