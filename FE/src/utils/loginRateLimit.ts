/** sessionStorage key — absolute blocked-until epoch ms only (no credentials). */
export const LOGIN_RATE_LIMIT_UNTIL_KEY = "babi_order_login_rate_limit_until";

/** Reject absurd Retry-After values so the client never locks for days. */
export const LOGIN_RETRY_AFTER_MAX_SECONDS = 3600;

export const LOGIN_RATE_LIMIT_GENERIC_MESSAGE =
  "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";

/**
 * Parse Retry-After seconds from a response header value.
 * Returns undefined for missing/invalid/out-of-range values (no client timer).
 */
export function parseRetryAfterSeconds(raw: string | null | undefined): number | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const seconds = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > LOGIN_RETRY_AFTER_MAX_SECONDS) {
    return undefined;
  }
  return seconds;
}

export function formatLoginRetryMessage(remainingSeconds: number): string {
  const remaining = Math.max(0, Math.ceil(remainingSeconds));
  if (remaining <= 0) {
    return LOGIN_RATE_LIMIT_GENERIC_MESSAGE;
  }
  if (remaining < 60) {
    return `요청이 너무 많습니다.\n${remaining}초 후 다시 시도할 수 있습니다.`;
  }
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const padded = String(seconds).padStart(2, "0");
  return `요청이 너무 많습니다.\n${minutes}분 ${padded}초 후 다시 시도할 수 있습니다.`;
}

export function remainingSecondsUntil(blockedUntilMs: number, nowMs: number = Date.now()): number {
  return Math.max(0, Math.ceil((blockedUntilMs - nowMs) / 1000));
}

export function readLoginBlockedUntil(): number | null {
  try {
    const raw = sessionStorage.getItem(LOGIN_RATE_LIMIT_UNTIL_KEY);
    if (raw == null || raw.trim() === "") return null;
    const until = Number.parseInt(raw, 10);
    if (!Number.isFinite(until) || until <= 0) {
      sessionStorage.removeItem(LOGIN_RATE_LIMIT_UNTIL_KEY);
      return null;
    }
    if (until <= Date.now()) {
      sessionStorage.removeItem(LOGIN_RATE_LIMIT_UNTIL_KEY);
      return null;
    }
    return until;
  } catch {
    return null;
  }
}

export function writeLoginBlockedUntil(blockedUntilMs: number): void {
  try {
    sessionStorage.setItem(LOGIN_RATE_LIMIT_UNTIL_KEY, String(blockedUntilMs));
  } catch {
    // sessionStorage unavailable — countdown still works in-memory for this page lifetime
  }
}

export function clearLoginBlockedUntil(): void {
  try {
    sessionStorage.removeItem(LOGIN_RATE_LIMIT_UNTIL_KEY);
  } catch {
    // ignore
  }
}
