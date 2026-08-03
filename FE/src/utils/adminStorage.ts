import type { Menu, MenuCategory, Order, Payment } from "../types/admin";

/**
 * 관리자 화면 데이터의 로컬 저장소 처리
 *
 * 새로고침해도 주문 현황이 목업 데이터로 되돌아가지 않도록,
 * 메뉴/주문/결제 상태를 브라우저 localStorage 에 보관합니다.
 */
const STORAGE_KEY = "gdgoc-admin-data-v1";

export interface AdminPersistedState {
  /** 사장님이 추가한 카테고리까지 포함한 전체 목록 (구버전 저장 값에는 없을 수 있음) */
  categories: MenuCategory[] | null;
  menus: Menu[];
  orders: Order[];
  payments: Payment[];
  /** 마지막으로 부여된 대기번호 (픽업 완료로 주문이 사라져도 번호는 이어서 채번) */
  lastOrderNumber: number;
}

/** 저장된 상태를 읽어옵니다. 저장 이력이 없거나 형식이 깨졌으면 null */
export function loadAdminState(): AdminPersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AdminPersistedState>;
    // 주문을 모두 픽업 처리한 "빈 배열" 상태도 유효한 저장 값으로 취급해야 하므로
    // 값의 존재 여부가 아니라 배열 여부로 검증합니다.
    if (
      !Array.isArray(parsed.menus) ||
      !Array.isArray(parsed.orders) ||
      !Array.isArray(parsed.payments)
    ) {
      return null;
    }
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories : null,
      menus: parsed.menus,
      orders: parsed.orders,
      payments: parsed.payments,
      lastOrderNumber:
        typeof parsed.lastOrderNumber === "number" ? parsed.lastOrderNumber : 0,
    };
  } catch {
    // 저장소 접근 불가(사파리 프라이빗 모드 등)나 JSON 파싱 실패 시 초기 데이터 사용
    return null;
  }
}

export function saveAdminState(state: AdminPersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장 실패는 화면 동작에 영향을 주지 않으므로 무시
  }
}

export function clearAdminState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}
