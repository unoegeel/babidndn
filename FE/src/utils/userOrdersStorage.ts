import type { Order } from "../types/user";

/** 현재 주문 목록 localStorage key (v2 — 정식 운영 cutover) */
export const ORDERS_STORAGE_KEY = "babi_user_orders_v2";

const LEGACY_ORDERS_STORAGE_KEY = "babi_user_orders";
const ORDER_ACCESS_TOKENS_KEY = "babi_order_access_tokens";
const STORAGE_MIGRATION_KEY = "babi_user_orders_storage_migration";

/** 운영 초기화 시 legacy 테스트 주문·토큰을 무효화하는 마이그레이션 버전 */
export const CURRENT_USER_ORDERS_STORAGE_MIGRATION = 2;

/**
 * 정식 운영 cutover: legacy 주문 목록·access token 맵을 제거하고 v2 스키마로 전환.
 * 다른 localStorage 키(장바구니, 알림, client key 등)는 건드리지 않는다.
 */
export function runUserOrdersStorageMigration(): void {
  try {
    const raw = localStorage.getItem(STORAGE_MIGRATION_KEY);
    const migrated = raw ? Number(raw) : 0;
    if (Number.isFinite(migrated) && migrated >= CURRENT_USER_ORDERS_STORAGE_MIGRATION) {
      return;
    }

    localStorage.removeItem(LEGACY_ORDERS_STORAGE_KEY);
    localStorage.removeItem(ORDER_ACCESS_TOKENS_KEY);
    localStorage.setItem(STORAGE_MIGRATION_KEY, String(CURRENT_USER_ORDERS_STORAGE_MIGRATION));
  } catch {
    // private mode / quota — migration 실패 시에도 앱은 동작해야 함
  }
}

export function readStoredOrders(): Order[] {
  runUserOrdersStorageMigration();
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Order[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredOrders(orders: Order[]): void {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // ignore quota / private mode
  }
}
