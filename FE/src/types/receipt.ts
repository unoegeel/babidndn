/** 영수증 라인 옵션 (주문 시점 스냅샷) */
export interface ReceiptOptionLine {
  name: string;
  additionalPrice: number;
  quantity: number;
  groupType: string | null;
}

/** 영수증 메뉴 라인 (주문 시점 스냅샷) */
export interface ReceiptItemLine {
  menuName: string;
  menuPrice: number;
  quantity: number;
  lineAmount: number;
  options: ReceiptOptionLine[];
}

/** 영수증 결제 요약 — Payment.amount는 교차 검증용으로 Order.totalAmount와 별도 보존 */
export interface ReceiptPaymentInfo {
  methodLabel: string | null;
  amount: number;
  status: string;
  approvedAt: string | null;
  /** order.totalAmount와 다를 때 UI에서 참고용 */
  amountMismatch: boolean;
}

/**
 * 전자영수증·향후 실물 영수증 공통 ViewModel.
 * 금액은 주문/결제 API 스냅샷을 그대로 사용한다 (프론트 재계산 금지).
 */
export interface ReceiptViewModel {
  orderId: number;
  tossOrderId: string;
  pickupNumber: number;
  orderedAt: string;
  orderStatus: string;
  paymentStatus: string;
  items: ReceiptItemLine[];
  /** Order.totalAmount — 영수증 최종 결제금액의 권위 값 */
  totalAmount: number;
  payment: ReceiptPaymentInfo | null;
}
