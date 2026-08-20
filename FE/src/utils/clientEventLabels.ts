import type { ClientEventType } from "../types/clientEvent";

/** ClientEventType → Developer Console 한국어 라벨 */
export const CLIENT_EVENT_TYPE_LABELS: Record<ClientEventType, string> = {
  MENU_VIEW: "메뉴 조회",
  MENU_OPTION_OPEN: "옵션 시트 열기",
  OPTION_SELECTED: "옵션 선택",
  ADD_TO_CART: "장바구니 추가",
  CART_VIEW: "장바구니 조회",
  CART_ITEM_UPDATED: "장바구니 수량 변경",
  CART_ITEM_REMOVED: "장바구니 항목 삭제",
  CHECKOUT_VIEW: "결제 화면 진입",
  PAYMENT_START: "결제 시작",
  PAYMENT_SUCCESS: "결제 성공",
  PAYMENT_FAIL: "결제 실패",
  ORDER_CREATED: "주문 생성",
  ORDER_STATUS_VIEW: "주문 현황 조회",
  ORDER_COMPLETED: "주문 완료",
  SAVED_MENU_CREATED: "나만의 메뉴 생성",
  SAVED_MENU_VIEW: "나만의 메뉴 조회",
  SAVED_MENU_UPDATED: "나만의 메뉴 수정",
  SAVED_MENU_DELETED: "나만의 메뉴 삭제",
  SAVED_MENU_REORDER: "나만의 메뉴 재주문",
  REVIEW_SUBMITTED: "리뷰 등록",
  CONTACT_SUBMITTED: "문의 등록",
};

export const CLIENT_EVENT_TYPES = Object.keys(CLIENT_EVENT_TYPE_LABELS) as ClientEventType[];

export function eventTypeLabelKo(eventType: ClientEventType): string {
  return CLIENT_EVENT_TYPE_LABELS[eventType] ?? eventType;
}

export function truncateId(value: string, visibleLength = 8): string {
  if (!value) return "-";
  if (value.length <= visibleLength + 3) return value;
  return `${value.slice(0, visibleLength)}...`;
}

export function formatMetadata(metadata?: Record<string, unknown>): string {
  if (!metadata || Object.keys(metadata).length === 0) return "{}";
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return "{}";
  }
}

export function shouldCollapseMetadata(text: string, maxLines = 12): boolean {
  return text.split("\n").length > maxLines;
}
