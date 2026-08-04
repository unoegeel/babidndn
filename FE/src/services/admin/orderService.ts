import { api, BASE_URL } from "../../api/client";
import { getAdminToken } from "../../constants/adminAccount";
import type {
  ApiOrderStatus,
  OrderDetailResponse,
  OrderSummaryResponse,
} from "../../types/api";

/**
 * 관리자 주문 API 서비스 (Bearer 토큰 필요)
 */
export const adminOrderService = {
  /**
   * 전체 주문 조회 (최근 생성 순)
   * GET /api/orders
   */
  getOrders(): Promise<OrderSummaryResponse[]> {
    return api.get<OrderSummaryResponse[]>("/api/orders");
  },

  /**
   * 주문 상세 조회
   * GET /api/orders/{id}
   */
  getOrder(orderId: number | string): Promise<OrderDetailResponse> {
    return api.get<OrderDetailResponse>(`/api/orders/${orderId}`);
  },

  /**
   * 주문 상태 변경
   * PUT /api/orders/{id}/status
   */
  updateStatus(orderId: number | string, status: ApiOrderStatus): Promise<OrderDetailResponse> {
    // 일부 프록시 환경에서 PATCH 가 누락되는 경우가 있어 PUT 사용
    return api.put<OrderDetailResponse>(`/api/orders/${orderId}/status`, { status });
  },

  /**
   * 고객 호출 (READY)
   * POST /api/orders/{id}/call
   */
  call(orderId: number | string): Promise<OrderDetailResponse> {
    return api.post<OrderDetailResponse>(`/api/orders/${orderId}/call`, {});
  },
};

/**
 * 주문 실시간 알림 구독 (SSE)
 * GET /api/orders/stream
 *
 * EventSource 는 Authorization 헤더를 붙일 수 없어 fetch 스트림으로 직접 읽습니다.
 * 이벤트 종류와 무관하게 이벤트가 도착할 때마다 onEvent 를 호출하므로,
 * 구독자는 콜백에서 목록을 다시 불러오면 됩니다.
 *
 * @returns 구독 해제 함수
 */
export function subscribeOrderEvents(onEvent: () => void): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const token = getAdminToken();
      const response = await fetch(`${BASE_URL}/api/orders/stream`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        signal: controller.signal,
      });
      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE 이벤트는 빈 줄(\n\n)로 구분됩니다.
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          // 주석(keep-alive) 이벤트는 무시
          if (rawEvent.split("\n").some((line) => line.startsWith("data:"))) {
            onEvent();
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch {
      // 연결 실패/중단 시에는 주기 폴링이 대신 동작하므로 조용히 종료
    }
  })();

  return () => controller.abort();
}
