import type { Category, Food } from "@/types";

// Set NEXT_PUBLIC_API_URL in .env.local to override this default.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiError(`${path} failed: ${res.status} ${res.statusText}`, res.status);
  }

  if (res.status === HttpStatusNoContent) return undefined as T;
  return (await res.json()) as T;
}

const HttpStatusNoContent = 204;

export const api = {
  // Public: only active categories (matches CategoryController#findAll)
  getCategories: () => request<Category[]>("/category"),
  // Public: only active foods (matches FoodController#findAll)
  getFoods: () => request<Food[]>("/food"),
  getFood: (id: string) => request<Food>(`/food/${id}`),
};

export { ApiError };
