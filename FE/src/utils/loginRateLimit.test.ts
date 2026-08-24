import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOGIN_RATE_LIMIT_GENERIC_MESSAGE,
  LOGIN_RATE_LIMIT_UNTIL_KEY,
  clearLoginBlockedUntil,
  formatLoginRetryMessage,
  parseRetryAfterSeconds,
  readLoginBlockedUntil,
  remainingSecondsUntil,
  writeLoginBlockedUntil,
} from "./loginRateLimit";

describe("parseRetryAfterSeconds", () => {
  it("parses valid Retry-After", () => {
    expect(parseRetryAfterSeconds("283")).toBe(283);
  });

  it("rejects missing invalid and oversized values", () => {
    expect(parseRetryAfterSeconds(null)).toBeUndefined();
    expect(parseRetryAfterSeconds("")).toBeUndefined();
    expect(parseRetryAfterSeconds("abc")).toBeUndefined();
    expect(parseRetryAfterSeconds("-1")).toBeUndefined();
    expect(parseRetryAfterSeconds("0")).toBeUndefined();
    expect(parseRetryAfterSeconds("99999")).toBeUndefined();
  });
});

describe("formatLoginRetryMessage", () => {
  it("formats minutes and padded seconds", () => {
    expect(formatLoginRetryMessage(283)).toBe(
      "요청이 너무 많습니다.\n4분 43초 후 다시 시도할 수 있습니다.",
    );
  });

  it("formats under one minute", () => {
    expect(formatLoginRetryMessage(37)).toBe(
      "요청이 너무 많습니다.\n37초 후 다시 시도할 수 있습니다.",
    );
  });
});

describe("remainingSecondsUntil", () => {
  it("uses absolute timestamp with ceil", () => {
    expect(remainingSecondsUntil(10_500, 10_000)).toBe(1);
    expect(remainingSecondsUntil(10_000, 10_500)).toBe(0);
  });
});

describe("login blockedUntil sessionStorage", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("stores and restores future blockedUntil", () => {
    const until = Date.now() + 283_000;
    writeLoginBlockedUntil(until);
    expect(sessionStorage.getItem(LOGIN_RATE_LIMIT_UNTIL_KEY)).toBe(String(until));
    expect(readLoginBlockedUntil()).toBe(until);
  });

  it("clears expired storage on read", () => {
    writeLoginBlockedUntil(Date.now() - 1000);
    expect(readLoginBlockedUntil()).toBeNull();
    expect(sessionStorage.getItem(LOGIN_RATE_LIMIT_UNTIL_KEY)).toBeNull();
  });

  it("clearLoginBlockedUntil removes entry", () => {
    writeLoginBlockedUntil(Date.now() + 60_000);
    clearLoginBlockedUntil();
    expect(sessionStorage.getItem(LOGIN_RATE_LIMIT_UNTIL_KEY)).toBeNull();
  });
});

describe("generic message constant", () => {
  it("matches expected copy", () => {
    expect(LOGIN_RATE_LIMIT_GENERIC_MESSAGE).toContain("요청이 너무 많습니다");
  });
});
