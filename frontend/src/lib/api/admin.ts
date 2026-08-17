import type { Food, FoodSummary } from "@/types";
import { apiFetch, type QueryOptions } from "./client";

/**
 * Admin-only reads and mutations. Nothing here is privileged by virtue of
 * living in this module — the API's RolesGuard is the boundary. These are
 * simply the endpoints a customer session has no reason to call.
 */
export const adminApi = {
  /** Active *and* hidden foods. `menuApi.getFoods` returns the public list. */
  getAllFoods: (options?: QueryOptions) => apiFetch<Food[]>("/food/all", options),

  toggleFoodAvailability: (foodId: string, options?: QueryOptions) =>
    apiFetch<FoodSummary>(`/food/${encodeURIComponent(foodId)}/availability`, {
      ...options,
      method: "PATCH",
    }),
};
