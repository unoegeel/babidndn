import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "../types/user";
import {
  CURRENT_USER_ORDERS_STORAGE_MIGRATION,
  ORDERS_STORAGE_KEY,
  readStoredOrders,
  runUserOrdersStorageMigration,
  writeStoredOrders,
} from "./userOrdersStorage";

const LEGACY_ORDERS_STORAGE_KEY = "babi_user_orders";
const ORDER_ACCESS_TOKENS_KEY = "babi_order_access_tokens";
const STORAGE_MIGRATION_KEY = "babi_user_orders_storage_migration";

const sampleOrder: Order = {
  orderId: "1",
  items: [],
  totalPrice: 1000,
  status: "COMPLETED",
  createdAt: "2026-01-01 12:00",
  pickupNumber: "1",
  waitingCount: 0,
  waitingTime: 0,
};

describe("userOrdersStorage", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map<string, string>();
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

  it("migrates legacy orders and access tokens on first read", () => {
    store.set(LEGACY_ORDERS_STORAGE_KEY, JSON.stringify([sampleOrder]));
    store.set(ORDER_ACCESS_TOKENS_KEY, JSON.stringify({ "1": "token" }));

    expect(readStoredOrders()).toEqual([]);
    expect(store.has(LEGACY_ORDERS_STORAGE_KEY)).toBe(false);
    expect(store.has(ORDER_ACCESS_TOKENS_KEY)).toBe(false);
    expect(store.get(STORAGE_MIGRATION_KEY)).toBe(String(CURRENT_USER_ORDERS_STORAGE_MIGRATION));
  });

  it("reads and writes v2 orders after migration", () => {
    runUserOrdersStorageMigration();
    writeStoredOrders([sampleOrder]);
    expect(readStoredOrders()).toEqual([sampleOrder]);
    expect(store.get(ORDERS_STORAGE_KEY)).toContain('"orderId":"1"');
  });

  it("does not re-run migration when already at current version", () => {
    store.set(STORAGE_MIGRATION_KEY, String(CURRENT_USER_ORDERS_STORAGE_MIGRATION));
    store.set(ORDER_ACCESS_TOKENS_KEY, JSON.stringify({ "2": "keep" }));

    runUserOrdersStorageMigration();

    expect(store.has(ORDER_ACCESS_TOKENS_KEY)).toBe(true);
  });
});
