import type { ClientEventMetadata } from "../../types/clientEvent";
import { MAX_METADATA_KEYS } from "../../types/clientEvent";

const MAX_STRING_LENGTH = 500;
const MAX_KEY_LENGTH = 50;

export function sanitizeRoute(pathname: string): string {
  const raw = pathname.split("?")[0]?.split("#")[0] ?? "/";
  const segments = raw.split("/").filter(Boolean);
  const sanitized = segments.map((segment) =>
    /^\d+$/.test(segment) ? ":id" : segment,
  );
  return sanitized.length === 0 ? "/" : `/${sanitized.join("/")}`;
}

export function sanitizeMetadata(
  metadata?: ClientEventMetadata,
): ClientEventMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  const entries = Object.entries(metadata).slice(0, MAX_METADATA_KEYS);
  const sanitized: ClientEventMetadata = {};

  for (const [rawKey, rawValue] of entries) {
    const key = rawKey.trim().slice(0, MAX_KEY_LENGTH);
    if (!key) continue;

    if (rawValue == null) {
      sanitized[key] = null;
      continue;
    }
    if (typeof rawValue === "boolean" || typeof rawValue === "number") {
      sanitized[key] = rawValue;
      continue;
    }
    if (typeof rawValue === "string") {
      sanitized[key] = rawValue.slice(0, MAX_STRING_LENGTH);
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function sanitizeRelatedRequestId(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(trimmed) ? trimmed : undefined;
}
