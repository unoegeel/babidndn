import { api } from "../../api/client";

export interface PushSubscribeBody {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * 유저 Web Push 구독 API
 */
export const pushService = {
  getVapidPublicKey(): Promise<{ publicKey: string }> {
    return api.get<{ publicKey: string }>("/api/push/vapid-public-key");
  },

  subscribe(body: PushSubscribeBody): Promise<void> {
    return api.post<void>("/api/push/subscriptions", body);
  },

  linkOrder(endpoint: string, orderId: number | string): Promise<void> {
    return api.post<void>("/api/push/subscriptions/link-order", {
      endpoint,
      orderId: Number(orderId),
    });
  },
};
