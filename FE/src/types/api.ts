// 백엔드(https://babidndn.shop) Swagger 스펙 기준 요청/응답 DTO 정의
import type { SaleStatus } from "./user";

/* ── 주문 (Order) ── */

export interface OrderItemOptionRequest {
  menuOptionId: number;
  quantity: number;
}

export interface OrderItemRequest {
  menuId: number;
  quantity: number;
  /** 옵션이 없으면 생략하거나 빈 배열 */
  options?: OrderItemOptionRequest[];
}

export interface OrderCreateRequest {
  items: OrderItemRequest[];
}

/** 서버 주문 상태 (주문 생성 직후는 PREPARING) */
export type ApiOrderStatus = "PREPARING" | "READY" | "COMPLETED" | "CANCELED";

export interface OrderItemOptionResponse {
  id: number;
  menuOptionId: number;
  groupType: string | null;
  name: string;
  additionalPrice: number;
  quantity: number;
}

export interface OrderItemResponse {
  id: number;
  menuId: number;
  menuName: string;
  menuPrice: number;
  quantity: number;
  lineAmount: number;
  options: OrderItemOptionResponse[];
}

export interface OrderDetailResponse {
  id: number;
  tossOrderId: string;
  pickupNumber: number;
  status: ApiOrderStatus;
  totalAmount: number;
  /** 결제 전이면 UNPAID */
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemResponse[];
}

export interface OrderSummaryResponse {
  id: number;
  pickupNumber: number;
  status: ApiOrderStatus;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
}

export interface OrderStatusUpdateRequest {
  status: ApiOrderStatus;
}

/* ── 관리자 (Admin) ── */

export interface AdminLoginRequest {
  loginId: string;
  password: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface CategoryResponse {
  id: number;
  name: string;
  displayOrder: number;
}

export interface CategoryUpsertRequest {
  name: string;
  displayOrder: number;
}

export interface MenuUpsertRequest {
  categoryId: number;
  name: string;
  description?: string | null;
  basePrice: number;
  imageUrl?: string | null;
  displayOrder: number;
  saleStatus: SaleStatus;
  toppingEnabled: boolean;
}

export interface MenuSaleStatusUpdateRequest {
  saleStatus: SaleStatus;
}

export interface MenuOptionUpsertRequest {
  /** 옵션 그룹 (생략 시 기타 옵션) */
  groupType?: "SIZE" | "TOPPING_ADD" | "TOPPING_REMOVE" | null;
  name: string;
  additionalPrice: number;
  maxQuantity: number;
  defaultSelected?: boolean;
  displayOrder: number;
}

/* ── 결제 (Payment) ── */

export interface PaymentConfirmRequest {
  /** 토스 결제 키 (successUrl 쿼리로 전달됨) */
  paymentKey: string;
  /** 토스 주문번호 (주문 생성 응답의 tossOrderId) */
  orderId: string;
  amount: number;
}

export interface PaymentConfirmResponse {
  id: number;
  paymentKey: string;
  /** 내부 주문 ID */
  orderId: number;
  tossOrderId: string;
  amount: number;
  status: string;
  approvedAt?: string | null;
}

export interface PaymentResponse {
  id: number;
  paymentKey: string;
  orderId: number;
  tossOrderId: string;
  amount: number;
  /** DONE / CANCELED 등 토스 결제 상태 */
  status: string;
  cancelReason?: string | null;
  approvedAt?: string | null;
  createdAt: string;
}

export interface PaymentCancelRequest {
  cancelReason: string;
}
