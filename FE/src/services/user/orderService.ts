import {
  api,
  clearOrderApiBaseUrl,
  getOrderApiBaseUrl,
  rememberOrderApiBaseUrl,
} from "../../api/client";
import type { CartItem, OrderStatus, Order, MenuOption, GroupType } from "../../types/user";

// --- DTO Types ---

export interface OrderItemOptionRequest {
  menuOptionId: number;
  quantity: number;
}

export interface OrderItemRequest {
  menuId: number;
  quantity: number;
  options?: OrderItemOptionRequest[];
}

export interface OrderCreateRequest {
  items: OrderItemRequest[];
}

export interface OrderItemOptionResponse {
  id: number;
  menuOptionId: number;
  groupType: string;
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
  status: OrderStatus;
  totalAmount: number;
  paymentStatus: string; // "UNPAID" | "DONE"
  createdAt: string;
  updatedAt: string;
  items: OrderItemResponse[];
  /** 진행 중이며 대기번호가 더 빠른 주문 수 (서버 계산) */
  waitingAheadCount?: number;
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
    try {
      const createdDate = new Date(res.createdAt);
      if (!isNaN(createdDate.getTime())) {
        formattedDate = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}-${String(createdDate.getDate()).padStart(2, "0")} ${String(createdDate.getHours()).padStart(2, "0")}:${String(createdDate.getMinutes()).padStart(2, "0")}`;
      }
    } catch {
      // 파싱 실패 시 원본 사용
    }
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
    pickupNumber: String(res.pickupNumber),
    waitingCount,
    // 앞 대기 1명당 약 2분, 앞 대기가 없으면 약 1분
    waitingTime: waitingCount > 0 ? waitingCount * 2 : res.status === "PREPARING" ? 1 : 0,
  };
}

export interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
  /** 주문 생성 시 받은 백엔드 PK — 결제 승인 시 동일 DB 조회 보장 */
  internalOrderId?: number;
}

export interface PaymentConfirmResponse {
  id: number;
  paymentKey: string;
  orderId: number;
  tossOrderId: string;
  amount: number;
  status: string; // "DONE"
  approvedAt: string;
}

export interface PaymentFailResponse {
  code: string;
  message: string;
  orderId?: string;
}

// --- Order Service ---

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
        })
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
