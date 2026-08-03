import { api } from "../../api/client";
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

  return {
    orderId: String(res.id),
    items,
    totalPrice: res.totalAmount,
    status: res.status,
    createdAt: formattedDate,
    pickupNumber: String(res.pickupNumber),
    waitingCount: res.status === "READY" || res.status === "COMPLETED" ? 0 : 2,
    waitingTime: res.status === "READY" || res.status === "COMPLETED" ? 0 : 5,
  };
}

export interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
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
    return api.post<OrderDetailResponse>("/api/orders", body);
  },

  /**
   * 주문 상세 조회 (GET /api/orders/{id})
   */
  async getOrder(id: string | number): Promise<OrderDetailResponse> {
    return api.get<OrderDetailResponse>(`/api/orders/${id}`);
  },

  /**
   * 결제 승인 요청 (POST /api/payments/confirm)
   */
  async confirmPayment(data: PaymentConfirmRequest): Promise<PaymentConfirmResponse> {
    return api.post<PaymentConfirmResponse>("/api/payments/confirm", data);
  },
};
