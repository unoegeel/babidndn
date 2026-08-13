import {
  api,
  clearOrderApiBaseUrl,
  getOrderApiBaseUrl,
  rememberOrderApiBaseUrl,
} from "../../api/client";
import type {
  OrderCreateRequest,
  OrderDetailResponse,
  OrderItemOptionRequest,
  OrderItemRequest,
  PaymentConfirmResponse,
  WaitingCountResponse,
} from "../../types/api";
import type { CartItem, Order, MenuOption, GroupType } from "../../types/user";
import { formatServerDateTimeDash } from "../../utils/serverDate";

/**
 * 결제 승인 요청.
 * types/api.PaymentConfirmRequest 와 동일하되, BE가 받는 internalOrderId 를 포함한다.
 * (이번 STEP에서는 Confirm Request 통합을 보류하고 service 전용으로 유지)
 */
export interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
  /** 주문 생성 시 받은 백엔드 PK — 결제 승인 시 동일 DB 조회 보장 */
  internalOrderId?: number;
}

export function mapOrderDetailToOrder(res: OrderDetailResponse): Order {
  const items: CartItem[] = res.items.map((item) => {
    const selectedOptions: MenuOption[] = [];
    item.options.forEach((opt) => {
      for (let i = 0; i < opt.quantity; i++) {
        selectedOptions.push({
          id: opt.menuOptionId,
          groupType: opt.groupType as GroupType,
          name: opt.name,
          additionalPrice: opt.additionalPrice,
          maxQuantity: 1,
          defaultSelected: false,
          displayOrder: 1,
        });
      }
    });

    return {
      cartItemId: `${item.id}`,
      menuId: item.menuId,
      menuName: item.menuName,
      basePrice: item.menuPrice,
      imageUrl: null,
      selectedOptions,
      quantity: item.quantity,
      totalPrice: item.lineAmount,
    };
  });

  let formattedDate = res.createdAt;
  if (res.createdAt) {
    formattedDate = formatServerDateTimeDash(res.createdAt);
  }

  const waitingCount =
    res.status === "READY" || res.status === "COMPLETED"
      ? 0
      : Math.max(0, res.waitingAheadCount ?? 0);

  return {
    orderId: String(res.id),
    items,
    totalPrice: res.totalAmount,
    status:
      res.paymentStatus === "CANCELED" || res.paymentStatus === "PARTIAL_CANCELED"
        ? "CANCELED"
        : res.status,
    createdAt: formattedDate,
    updatedAt: res.updatedAt || undefined,
    pickupNumber: String(res.pickupNumber),
    waitingCount,
    // 앞 대기 1명당 약 2분, 앞 대기가 없으면 약 1분
    waitingTime: waitingCount > 0 ? waitingCount * 2 : res.status === "PREPARING" ? 1 : 0,
  };
}

export const orderService = {
  /**
   * 주문 생성 (POST /api/orders)
   */
  async createOrder(cartItems: CartItem[]): Promise<OrderDetailResponse> {
    const items: OrderItemRequest[] = cartItems.map((cartItem) => {
      // selectedOptions에서 같은 menuOptionId(id)를 묶어 quantity로 변환
      const optionMap = new Map<number, number>();
      cartItem.selectedOptions.forEach((opt) => {
        const count = optionMap.get(opt.id) || 0;
        optionMap.set(opt.id, count + 1);
      });

      const options: OrderItemOptionRequest[] = Array.from(optionMap.entries()).map(
        ([menuOptionId, quantity]) => ({
          menuOptionId,
          quantity,
        }),
      );

      return {
        menuId: cartItem.menuId,
        quantity: cartItem.quantity,
        options,
      };
    });

    const body: OrderCreateRequest = { items };
    rememberOrderApiBaseUrl();
    return api.post<OrderDetailResponse>("/api/orders", body);
  },

  /**
   * 주문 상세 조회 (GET /api/orders/{id})
   */
  async getOrder(id: string | number): Promise<OrderDetailResponse> {
    return api.get<OrderDetailResponse>(`/api/orders/${id}`, {
      baseUrl: getOrderApiBaseUrl(),
    });
  },

  /**
   * 매장 전체 대기 인원 (GET /api/orders/waiting-count)
   * 주문 전 메뉴 화면용. 개인 waitingAheadCount 와 분리.
   */
  async getWaitingCount(): Promise<WaitingCountResponse> {
    return api.get<WaitingCountResponse>("/api/orders/waiting-count");
  },

  /**
   * 결제 승인 요청 (POST /api/payments/confirm)
   */
  async confirmPayment(data: PaymentConfirmRequest): Promise<PaymentConfirmResponse> {
    return api.post<PaymentConfirmResponse>("/api/payments/confirm", data, {
      baseUrl: getOrderApiBaseUrl(),
    });
  },

  /**
   * 미결제 임시 주문 삭제 (DELETE /api/orders/{id}/unpaid)
   */
  async abandonUnpaidOrder(id: string | number): Promise<void> {
    return api.delete<void>(`/api/orders/${id}/unpaid`, {
      baseUrl: getOrderApiBaseUrl(),
    });
  },

  /** 결제 흐름 종료 시 저장된 API 서버 정보 제거 */
  clearOrderApiBaseUrl,
};
