import "server-only";

import { isProduction } from "../env";
import { getRequestId } from "./request-id";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, string | number | boolean | null | undefined>;

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveMinLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (
    configured === "debug" ||
    configured === "info" ||
    configured === "warn" ||
    configured === "error"
  ) {
    return configured;
  }
  return isProduction ? "info" : "debug";
}

function shouldEmit(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[resolveMinLevel()];
}

/**
 * Structured BFF logger. Production writes one JSON object per line (Vercel
 * log drains); local keeps a short tagged line for humans.
 *
 * Never put tokens, cookies, passwords, or raw Stripe payloads in `fields`.
 */
function emit(level: LogLevel, message: string, fields: LogFields = {}): void {
  if (!shouldEmit(level)) return;

  const requestId = getRequestId();
  const payload = {
    level,
    msg: message,
    ...(requestId ? { requestId } : {}),
    ...sanitizeFields(fields),
    time: new Date().toISOString(),
  };

  const line = isProduction
    ? JSON.stringify(payload)
    : `[bff] ${level} ${message}${formatDevFields(payload)}`;

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      // info/debug — stdout so Vercel still captures them
      console.log(line);
  }
}

function sanitizeFields(fields: LogFields): LogFields {
  const clean: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    clean[key] = value;
  }
  return clean;
}

function formatDevFields(payload: Record<string, unknown>): string {
  const rest = { ...payload };
  delete rest.level;
  delete rest.msg;
  delete rest.time;
  const entries = Object.entries(rest);
  if (entries.length === 0) return "";
  return ` ${entries.map(([k, v]) => `${k}=${String(v)}`).join(" ")}`;
}

export const bffLogger = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};
