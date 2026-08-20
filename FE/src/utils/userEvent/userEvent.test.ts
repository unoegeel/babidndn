import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  sanitizeMetadata,
  sanitizeRelatedRequestId,
  sanitizeRoute,
} from "./sanitizeMetadata";
import { resetViewEventDedupeForTests, shouldSuppressViewEvent } from "./viewDedupe";
import { buildClientEventPayloadForTest } from "./trackEvent";
import { resetSessionIdForTests } from "./sessionId";

describe("userEvent sanitizeRoute", () => {
  it("generalizes numeric path segments", () => {
    expect(sanitizeRoute("/user/orders/123/status")).toBe("/user/orders/:id/status");
  });

  it("strips query string", () => {
    expect(sanitizeRoute("/user/cart?tab=1")).toBe("/user/cart");
  });
});

describe("userEvent sanitizeMetadata", () => {
  it("keeps primitive values and trims strings", () => {
    expect(
      sanitizeMetadata({
        menuId: 1,
        quantity: 2,
        active: true,
        note: null,
        label: "  hello  ",
      }),
    ).toEqual({
      menuId: 1,
      quantity: 2,
      active: true,
      note: null,
      label: "  hello  ",
    });
  });

  it("drops unsupported value types", () => {
    expect(
      sanitizeMetadata({
        menuId: 1,
        nested: { bad: true } as unknown as number,
      }),
    ).toEqual({ menuId: 1 });
  });

  it("limits string length", () => {
    const long = "x".repeat(600);
    const result = sanitizeMetadata({ note: long });
    expect(result?.note).toHaveLength(500);
  });
});

describe("userEvent sanitizeRelatedRequestId", () => {
  it("accepts valid request id", () => {
    expect(sanitizeRelatedRequestId("req-abc-123")).toBe("req-abc-123");
  });

  it("rejects invalid request id", () => {
    expect(sanitizeRelatedRequestId("bad id")).toBeUndefined();
  });
});

describe("userEvent view dedupe", () => {
  beforeEach(() => {
    resetViewEventDedupeForTests();
  });

  it("suppresses duplicate MENU_VIEW within window", () => {
    expect(shouldSuppressViewEvent("MENU_VIEW", "10", 1000)).toBe(false);
    expect(shouldSuppressViewEvent("MENU_VIEW", "10", 2000)).toBe(true);
    expect(shouldSuppressViewEvent("MENU_VIEW", "10", 7000)).toBe(false);
  });

  it("does not dedupe ADD_TO_CART", () => {
    expect(shouldSuppressViewEvent("ADD_TO_CART", "10", 1000)).toBe(false);
    expect(shouldSuppressViewEvent("ADD_TO_CART", "10", 2000)).toBe(false);
  });

  it("dedupes by orderId for ORDER_STATUS_VIEW", () => {
    expect(shouldSuppressViewEvent("ORDER_STATUS_VIEW", "42", 1000)).toBe(false);
    expect(shouldSuppressViewEvent("ORDER_STATUS_VIEW", "42", 1500)).toBe(true);
    expect(shouldSuppressViewEvent("ORDER_STATUS_VIEW", "99", 1500)).toBe(false);
  });
});

describe("buildClientEventPayloadForTest", () => {
  beforeEach(() => {
    resetSessionIdForTests();
    vi.stubGlobal("crypto", {
      randomUUID: () => "test-event-id",
    });
  });

  it("builds payload with route and relatedRequestId", () => {
    const payload = buildClientEventPayloadForTest({
      type: "ORDER_CREATED",
      route: "/user/orders/99/checkout",
      relatedRequestId: "req-001",
      metadata: { orderId: 99, amount: 12000 },
    });

    expect(payload.eventId).toBe("test-event-id");
    expect(payload.eventType).toBe("ORDER_CREATED");
    expect(payload.route).toBe("/user/orders/:id/checkout");
    expect(payload.relatedRequestId).toBe("req-001");
    expect(payload.metadata).toEqual({ orderId: 99, amount: 12000 });
    expect(payload.anonymousId).toBeTruthy();
    expect(payload.sessionId).toBeTruthy();
    expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
