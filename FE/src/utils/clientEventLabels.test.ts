import { describe, expect, it } from "vitest";
import type { ClientEventType } from "../types/clientEvent";
import {
  CLIENT_EVENT_TYPE_LABELS,
  CLIENT_EVENT_TYPES,
  eventTypeLabelKo,
  formatMetadata,
  shouldCollapseMetadata,
  truncateId,
} from "./clientEventLabels";

describe("clientEventLabels", () => {
  it("maps every ClientEventType to a Korean label", () => {
    const expectedTypes: ClientEventType[] = [
      "MENU_VIEW",
      "MENU_OPTION_OPEN",
      "OPTION_SELECTED",
      "ADD_TO_CART",
      "CART_VIEW",
      "CART_ITEM_UPDATED",
      "CART_ITEM_REMOVED",
      "CHECKOUT_VIEW",
      "PAYMENT_START",
      "PAYMENT_SUCCESS",
      "PAYMENT_FAIL",
      "ORDER_CREATED",
      "ORDER_STATUS_VIEW",
      "ORDER_COMPLETED",
      "SAVED_MENU_CREATED",
      "SAVED_MENU_VIEW",
      "SAVED_MENU_UPDATED",
      "SAVED_MENU_DELETED",
      "SAVED_MENU_REORDER",
      "REVIEW_SUBMITTED",
      "CONTACT_SUBMITTED",
    ];

    expect(CLIENT_EVENT_TYPES).toEqual(expectedTypes);
    for (const type of expectedTypes) {
      expect(CLIENT_EVENT_TYPE_LABELS[type]).toBeTruthy();
      expect(eventTypeLabelKo(type)).not.toBe(type);
    }
  });

  it("returns known Korean labels for common events", () => {
    expect(eventTypeLabelKo("MENU_VIEW")).toBe("메뉴 조회");
    expect(eventTypeLabelKo("ADD_TO_CART")).toBe("장바구니 추가");
    expect(eventTypeLabelKo("ORDER_CREATED")).toBe("주문 생성");
  });

  it("truncates long ids in list view", () => {
    expect(truncateId("abcdefghijklmnop")).toBe("abcdefgh...");
    expect(truncateId("short")).toBe("short");
  });

  it("formats metadata as pretty JSON", () => {
    expect(formatMetadata({ menuId: 123, quantity: 1 })).toContain('"menuId": 123');
    expect(formatMetadata(undefined)).toBe("{}");
  });

  it("detects collapsible metadata", () => {
    const long = formatMetadata(
      Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`key${i}`, i])),
    );
    expect(shouldCollapseMetadata(long)).toBe(true);
    expect(shouldCollapseMetadata('{"menuId":1}')).toBe(false);
  });
});
