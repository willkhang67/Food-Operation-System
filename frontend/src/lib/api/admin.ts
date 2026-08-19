import type {
  Food,
  FoodSummary,
  FoodBasic,
  FoodImage,
} from "@/types";
import { apiFetch, type QueryOptions } from "./client";

export const adminApi = {
  
  // FOOD
  getAllFoods: (options?: QueryOptions) =>
    apiFetch<Food[]>("/food/all", options),

  toggleFoodAvailability: (
    foodId: string,
    options?: QueryOptions,
  ) =>
    apiFetch<FoodSummary>(
      `/food/${encodeURIComponent(foodId)}/availability`,
      {
        ...options,
        method: "PATCH",
      },
    ),

  createFood: (payload: {
    name: string;
    description?: string;
    price: number;
    categoryIds: string[];
    isAvailable?: boolean;
    images?: string[];
  }) =>
    apiFetch<Food>("/food", {
      method: "POST",
      body: payload,
    }),
    
  // BASIC INFORMATION
  updateFood: (
    id: string,
    payload: {
      name?: string;
      description?: string;
      categoryIds?: string[];
      isAvailable?: boolean;
    },
  ) =>
    apiFetch<Food>(
      `/food/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: payload,
      },
    ),

  // PRICE
  getFoodPriceHistory: (id: string) =>
    apiFetch<FoodBasic[]>(
      `/food/${encodeURIComponent(id)}/price`,
    ),

  getPriceHistory: (id: string) =>
  apiFetch<FoodBasic[]>(`/food/${encodeURIComponent(id)}/price`),

  updatePrice: (name: string, payload: { price: number }) =>
    apiFetch<FoodBasic>(
      `/food/${encodeURIComponent(name)}/price`,
      {
        method: "PATCH",
        body: payload,
      }
    ),

  // IMAGE
  getFoodImages: (id: string) =>
    apiFetch<FoodImage[]>(
      `/food/${encodeURIComponent(id)}/images`,
    ),

  addFoodImage: (
    id: string,
    url: string,
  ) =>
    apiFetch<FoodImage>(
      `/food/${encodeURIComponent(id)}/images`,
      {
        method: "POST",
        body: { url },
      },
    ),

  deleteFoodImage: (
    id: string,
    imageId: string,
  ) =>
    apiFetch<void>(
      `/food/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`,
      {
        method: "DELETE",
      },
    ),

  // DELETE FOOD
  softDeleteFood: (id: string) =>
    apiFetch<Food>(
      `/food/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    ),
    
  // CATEGORY
  createCategory: (payload: {
    name: string;
    description?: string;
  }) =>
    apiFetch("/category", {
      method: "POST",
      body: payload,
    }),

  updateCategory: (
    id: string,
    payload: {
      name?: string;
      description?: string;
    },
  ) =>
    apiFetch(
      `/category/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: payload,
      },
    ),

  softDeleteCategory: (id: string) =>
    apiFetch(
      `/category/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    ),
};