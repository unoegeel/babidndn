import { describe, expect, it, beforeEach } from "vitest";
import { ApiError } from "../../api/client";
import {
  buildErrorFingerprint,
  resetErrorDedupeState,
  shouldSuppressDuplicate,
} from "./dedupe";
import { sanitizeRoute, sanitizeRelatedRequestId } from "./sanitize";
import { shouldReportUnhandledRejection } from "./reportFrontendError";

describe("sanitizeRoute", () => {
  it("generalizes numeric path segments", () => {
    expect(sanitizeRoute("/user/orders/123/receipt")).toBe("/user/orders/:id/receipt");
  });

  it("strips query string", () => {
    expect(sanitizeRoute("/user/cart?foo=bar")).toBe("/user/cart");
  });
});

describe("sanitizeRelatedRequestId", () => {
  it("accepts valid request id", () => {
    expect(sanitizeRelatedRequestId("test-request-id-01")).toBe("test-request-id-01");
  });

  it("rejects invalid request id", () => {
    expect(sanitizeRelatedRequestId("bad id")).toBeUndefined();
  });
});

describe("dedupe", () => {
  beforeEach(() => {
    resetErrorDedupeState();
  });

  it("suppresses duplicate fingerprint within window", () => {
    const fp = buildErrorFingerprint("window", "/user", "TypeError", "boom");
    expect(shouldSuppressDuplicate(fp, 1000)).toBe(false);
    expect(shouldSuppressDuplicate(fp, 1500)).toBe(true);
    expect(shouldSuppressDuplicate(fp, 5000)).toBe(false);
  });
});

describe("shouldReportUnhandledRejection", () => {
  it("skips ApiError business/server errors", () => {
    expect(shouldReportUnhandledRejection(new ApiError(404, "NOT_FOUND"))).toBe(false);
    expect(shouldReportUnhandledRejection(new ApiError(500, "INTERNAL"))).toBe(false);
  });

  it("reports runtime errors", () => {
    expect(shouldReportUnhandledRejection(new TypeError("fail"))).toBe(true);
  });
});
