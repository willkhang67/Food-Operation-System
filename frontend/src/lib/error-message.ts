import { isApiError } from "./api";

/** API errors already carry a message written for the user, so prefer it. */
export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Field-level validation messages, when the API reported more than one. */
export function toErrorDetails(error: unknown): string[] | undefined {
  if (!isApiError(error)) return undefined;
  return error.details && error.details.length > 1 ? error.details : undefined;
}
