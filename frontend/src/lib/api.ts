import type { Category, Food } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const HttpStatusNoContent = 204;

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

async function requestWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const token = api.getToken();
  if (!token) throw new ApiError("Not authenticated", 401);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    
    api.clearAuthData();
    throw new ApiError("Session expired. Please login again.", 401);
  }

  if (!res.ok) {
    throw new ApiError(`${path} failed: ${res.status} ${res.statusText}`, res.status);
  }

  if (res.status === HttpStatusNoContent) return undefined as T;
  return (await res.json()) as T;
}

interface AuthUser {
  [key: string]: unknown;
}

interface NormalizedLoginResponse {
  accessToken: string;
  user: AuthUser;
}

function normalizeLoginResponse(raw: unknown): NormalizedLoginResponse {
  const body = raw as Record<string, any>;
  const source = body?.data ?? body;

  const accessToken: string | undefined =
    source?.accessToken ?? source?.access_token ?? source?.token;
  const user: AuthUser | undefined = source?.user ?? source?.data?.user;

  if (!accessToken || !user) {
    console.error("Login response không đúng shape mong đợi:", raw);
    throw new ApiError(
      "Login response thiếu accessToken hoặc user — kiểm tra console để xem raw response.",
      500,
    );
  }

  return { accessToken, user };
}

export const api = {
  getCategories: () => request<Category[]>("/category"),
  getFoods: () => request<Food[]>("/food"),
  getFood: (id: string) => request<Food>(`/food/${id}`),

  async login(credentials: { email: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const raw = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(raw?.message || "Login failed", response.status);
    }

    return normalizeLoginResponse(raw);
  },

  setAuthData(accessToken: string, user: AuthUser) {
    if (typeof window === "undefined") return;
    if (!accessToken || !user) {
      console.error("setAuthData bị gọi với dữ liệu rỗng:", { accessToken, user });
      return;
    }
    localStorage.setItem("token", accessToken);
    localStorage.setItem("user", JSON.stringify(user));

    window.dispatchEvent(new CustomEvent("auth:login", { detail: user }));
  },

  clearAuthData() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth:logout"));
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("token");
    return token && token !== "undefined" ? token : null;
  },

  getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("user");
    if (!raw || raw === "undefined") return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  isAdmin(): boolean {
    const user = this.getUser();
    if (!user) return false;
    const role = user["role"];
    return role === "ADMIN" || role === "admin";
  },

  async getAdminFoods() {
    return requestWithAuth<Food[]>("/food/all");
  },

  async toggleFoodAvailability(foodId: string) {
    return requestWithAuth<void>(`/food/${foodId}/availability`, {
      method: "PATCH",
    });
  },
};

export { ApiError };