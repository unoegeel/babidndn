import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { isOrderNotFoundError } from "./orderApiErrors";

describe("isOrderNotFoundError", () => {
  it("returns true for ORDER_NOT_FOUND 404", () => {
    expect(
      isOrderNotFoundError(new ApiError(404, "ORDER_NOT_FOUND", "주문을 찾을 수 없습니다.")),
    ).toBe(true);
  });

  it("returns false for generic 404 without order code", () => {
    expect(isOrderNotFoundError(new ApiError(404, "NOT_FOUND"))).toBe(false);
  });

  it("returns false for 500 and network-like errors", () => {
    expect(isOrderNotFoundError(new ApiError(500, "INTERNAL_ERROR"))).toBe(false);
    expect(isOrderNotFoundError(new Error("network"))).toBe(false);
  });
});
