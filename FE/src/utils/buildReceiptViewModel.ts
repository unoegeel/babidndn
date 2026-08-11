import type { PaymentResponse } from "../types/api";
import type { ReceiptViewModel } from "../types/receipt";

/** orderService / types/api OrderDetail 모두 수용하는 최소 구조 */
type OrderDetailLike = {
  id: number;
  tossOrderId: string;
  pickupNumber: number;
  createdAt: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  items: Array<{
    menuName: string;
    menuPrice: number;
    quantity: number;
    lineAmount: number;
    options: Array<{
      name: string;
      additionalPrice: number;
      quantity: number;
      groupType?: string | null;
    }>;
  }>;
};

/**
 * 주문 상세 + 결제 응답 → 공통 ReceiptViewModel.
 * 메뉴/옵션 금액은 스냅샷 필드를 그대로 쓰고, totalAmount는 Order 값을 권위로 둔다.
 */
export function buildReceiptViewModel(
  order: OrderDetailLike,
  payment: PaymentResponse | null,
): ReceiptViewModel {
  const items = order.items.map((item) => ({
    menuName: item.menuName,
    menuPrice: item.menuPrice,
    quantity: item.quantity,
    lineAmount: item.lineAmount,
    options: item.options.map((opt) => ({
      name: opt.name,
      additionalPrice: opt.additionalPrice,
      quantity: opt.quantity,
      groupType: opt.groupType ?? null,
    })),
  }));

  const paymentInfo = payment
    ? {
        methodLabel: payment.methodLabel ?? null,
        amount: payment.amount,
        status: payment.status,
        approvedAt: payment.approvedAt ?? null,
        amountMismatch: payment.amount !== order.totalAmount,
      }
    : null;

  return {
    orderId: order.id,
    tossOrderId: order.tossOrderId,
    pickupNumber: order.pickupNumber,
    orderedAt: order.createdAt,
    orderStatus: order.status,
    paymentStatus: order.paymentStatus,
    items,
    totalAmount: order.totalAmount,
    payment: paymentInfo,
  };
}
