import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOrderAccessToken,
  ORDER_ACCESS_TOKEN_HEADER,
  orderAccessTokenHeaders,
  removeOrderAccessToken,
  saveOrderAccessToken,
} from "./orderAccessToken";

describe("orderAccessToken", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  it("saves and reads token by orderId", () => {
    saveOrderAccessToken(12, "raw-token-abc");
    expect(getOrderAccessToken(12)).toBe("raw-token-abc");
    expect(getOrderAccessToken("12")).toBe("raw-token-abc");
    expect(orderAccessTokenHeaders(12)).toEqual({
      [ORDER_ACCESS_TOKEN_HEADER]: "raw-token-abc",
    });
  });

  it("does not invent a token when missing", () => {
    expect(getOrderAccessToken(99)).toBeNull();
    expect(orderAccessTokenHeaders(99)).toEqual({});
  });

  it("removes token", () => {
    saveOrderAccessToken(1, "t");
    removeOrderAccessToken(1);
    expect(getOrderAccessToken(1)).toBeNull();
  });

  it("keeps tokens for different orders isolated", () => {
    saveOrderAccessToken(1, "a");
    saveOrderAccessToken(2, "b");
    expect(getOrderAccessToken(1)).toBe("a");
    expect(getOrderAccessToken(2)).toBe("b");
  });
});
