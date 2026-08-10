export type UserRole = "user" | "staff" | "admin";

/** Public user shape returned by the API. Never contains credentials or tokens. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

/** Success payload of every /api/auth route that resolves a session. */
export interface SessionResponse {
  user: AuthUser;
}

export interface RegisterResponse extends SessionResponse {
  /** False when the account was created but auto-login failed; ask the user to sign in. */
  sessionStarted: boolean;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: string[];
}
