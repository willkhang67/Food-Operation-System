import { ApiErrorCode } from "@/types";
import type { AuthUser, Category, Food, LoginCredentials, RegisterPayload } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  constructor(message: string, status: number, code: ApiErrorCode) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

const HttpStatusNoContent = 204;

function mapStatusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return ApiErrorCode.ValidationError;
    case 401:
      return ApiErrorCode.Unauthenticated;
    case 403:
      return ApiErrorCode.Forbidden;
    case 404:
      return ApiErrorCode.NotFound;
    case 429:
      return ApiErrorCode.RateLimited;
    default:
      return status >= 500 ? ApiErrorCode.UpstreamUnavailable : ApiErrorCode.Internal;
  }
}

// ===== Token storage (Bearer, localStorage) =====

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  return token && token !== "undefined" ? token : null;
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("refreshToken");
  return token && token !== "undefined" ? token : null;
}

function persistTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
}

function persistUser(user: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem("user", JSON.stringify(user));
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth:logout"));
}

// ===== Base fetch helpers =====

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError("Network error — không kết nối được backend.", 0, ApiErrorCode.NetworkError);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    throw new ApiError(
      (body as { message?: string }).message ?? `${path} failed: ${res.status} ${res.statusText}`,
      res.status,
      mapStatusToCode(res.status),
    );
  }

  if (res.status === HttpStatusNoContent) return undefined as T;
  return (await res.json()) as T;
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ApiError("No refresh token", 401, ApiErrorCode.Unauthenticated);
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refreshToken}` },
  });

  if (!res.ok) {
    throw new ApiError("Refresh token invalid or expired", res.status, ApiErrorCode.Unauthenticated);
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  persistTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

async function requestWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  let token = getAccessToken();
  if (!token) throw new ApiError("Not authenticated", 401, ApiErrorCode.Unauthenticated);

  const doFetch = (accessToken: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

  let res: Response;
  try {
    res = await doFetch(token);
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError("Network error — không kết nối được backend.", 0, ApiErrorCode.NetworkError);
  }

  if (res.status === 401) {
    try {
      token = await refreshAccessToken();
    } catch {
      clearStoredAuth();
      throw new ApiError("Session expired. Please login again.", 401, ApiErrorCode.Unauthenticated);
    }
    res = await doFetch(token);
    if (res.status === 401) {
      clearStoredAuth();
      throw new ApiError("Session expired. Please login again.", 401, ApiErrorCode.Unauthenticated);
    }
  }

  if (!res.ok) {
    throw new ApiError(`${path} failed: ${res.status} ${res.statusText}`, res.status, mapStatusToCode(res.status));
  }

  if (res.status === HttpStatusNoContent) return undefined as T;
  return (await res.json()) as T;
}

// ===== menuApi — public reads, dùng cho customer/admin (hỗ trợ AbortSignal) =====

export const menuApi = {
  getCategories: (opts?: { signal?: AbortSignal }) =>
    request<Category[]>("/category", { signal: opts?.signal }),
  getFoods: (opts?: { signal?: AbortSignal }) =>
    request<Food[]>("/food", { signal: opts?.signal }),
  getFood: (id: string, opts?: { signal?: AbortSignal }) =>
    request<Food>(`/food/${id}`, { signal: opts?.signal }),
};

// ===== authApi — dùng cho AuthProvider (Context) =====

interface RawAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  refreshExpiresIn: string;
  user: AuthUser;
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    let raw: RawAuthResponse;
    try {
      raw = await request<RawAuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
    } catch (err) {
      if (isApiError(err) && err.code === ApiErrorCode.Unauthenticated) {
        throw new ApiError(err.message, err.status, ApiErrorCode.InvalidCredentials);
      }
      throw err;
    }

    persistTokens(raw.accessToken, raw.refreshToken);
    persistUser(raw.user);
    window.dispatchEvent(new CustomEvent("auth:login", { detail: raw.user }));

    return raw.user;
  },

  async me(opts?: { signal?: AbortSignal }): Promise<AuthUser> {
    const token = getAccessToken();
    if (!token) throw new ApiError("Not authenticated", 401, ApiErrorCode.Unauthenticated);
    return requestWithAuth<AuthUser>("/auth/me", { signal: opts?.signal });
  },

  // Backend chưa có POST /auth/register.
  async register(_payload: RegisterPayload): Promise<{ sessionStarted: boolean; user?: AuthUser }> {
    throw new ApiError(
      "Đăng ký chưa được hỗ trợ — backend chưa có endpoint /auth/register.",
      501,
      ApiErrorCode.UpstreamUnavailable,
    );
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${refreshToken}` },
        });
      } catch {
        // Mất mạng khi gọi logout không được chặn việc đăng xuất ở client.
      }
    }
    clearStoredAuth();
  },
};

// ===== api — các thao tác admin cần token (mutation), không còn chứa reads =====

export const api = {
  setAuthData(accessToken: string, user: AuthUser) {
    if (typeof window === "undefined") return;
    if (!accessToken || !user) {
      console.error("setAuthData bị gọi với dữ liệu rỗng:", { accessToken, user });
      return;
    }
    persistTokens(accessToken);
    persistUser(user);
    window.dispatchEvent(new CustomEvent("auth:login", { detail: user }));
  },

  clearAuthData() {
    clearStoredAuth();
  },

  getToken: getAccessToken,

  getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("user");
    if (!raw || raw === "undefined") return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!getAccessToken();
  },

  isAdmin(): boolean {
    const user = this.getUser();
    if (!user) return false;
    return typeof user.role === "string" && user.role.toUpperCase() === "ADMIN";
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