import type { Category, Food } from "@/types";
import { apiFetch, type QueryOptions } from "./client";

export const menuApi = {
  /** Active categories only, matching the API's public listing. */
  getCategories: (options?: QueryOptions) => apiFetch<Category[]>("/category", options),
  /** Active foods only, matching the API's public listing. */
  getFoods: (options?: QueryOptions) => apiFetch<Food[]>("/food", options),
  getFood: (id: string, options?: QueryOptions) =>
    apiFetch<Food>(`/food/${encodeURIComponent(id)}`, options),
};
