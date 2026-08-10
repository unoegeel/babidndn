// 사장님(admin) 화면에서 사용하는 도메인 타입 정의 (피그마 기준)

/**
 * 메뉴 카테고리
 * 사장님이 직접 추가할 수 있으므로 고정 목록이 아닌 문자열(카테고리명)로 다룹니다.
 */
export type MenuCategory = string;

/** 판매 상태 */
export type MenuStatus = "판매중" | "품절";

export interface Menu {
  /** 서버 메뉴 ID (문자열로 보관) */
  id: string;
  name: string;
  price: number;
  category: MenuCategory;
  status: MenuStatus;
  /** 토핑 선택 가능 여부 (목록 조회에는 없어 상세 조회로 채워짐) */
  toppingAvailable: boolean;
  /** 서버 카테고리 ID */
  categoryId?: number;
  /** 카테고리 내 표시 순서 */
  displayOrder?: number;
  /** 메뉴 설명 */
  description?: string | null;
  /** 메뉴 이미지 URL */
  imageUrl?: string | null;
}

/** 주문 안의 개별 메뉴 라인 */
export interface OrderItem {
  /** 서버 주문 상품 ID (문자열로 보관) */
  id: string;
  name: string;
  /** 주문 수량 */
  quantity: number;
  /** 옵션/추가사항 (예: "더블", "계란후라이 추가 x 3") */
  options: string[];
  /** 조리 완료 여부 (오른쪽 보드에서 초록 박스로 표시) — 화면 전용 상태 */
  cooked: boolean;
}

/**
 * 조리 진행 상태
 * - waiting: 신규 접수 (서버 PREPARING)
 * - cooking: 일부 조리 완료 (화면 전용)
 * - done: 전체 조리 완료 (화면 전용) 또는 서버 READY(호출 후)
 */
export type OrderStatus = "waiting" | "cooking" | "done";

export interface Order {
  /** 서버 주문 ID (문자열로 보관) */
  id: string;
  number: number;
  time: string;
  items: OrderItem[];
  status: OrderStatus;
  /** 호출 여부 (주문번호 초록색·재호출 가능). 서버 READY(/call)와 동기화 */
  called: boolean;
}

/** 결제 상태 */
export type PaymentStatus = "결제완료" | "취소됨" | "미결제";

export interface Payment {
  id: string;
  paidAt: string;
  /** 기간 필터용 epoch ms (승인 시각 기준) */
  paidAtMs: number;
  orderNumber: number;
  method: string;
  amount: number;
  status: PaymentStatus;
  summary: string;
  /** 서버 주문 ID (취소 시 필요) */
  orderId?: number;
  /** 토스 결제 키 (결제 완료 건만 존재, 취소 시 필요) */
  paymentKey?: string;
}
