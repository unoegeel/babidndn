import { pushService } from "../services/user/pushService";

const ENDPOINT_KEY = "babi_push_endpoint";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

async function waitForServiceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/**
 * 알림 권한 요청 후 Web Push 구독을 서버에 등록합니다.
 * @returns granted 여부
 */
export async function requestPermissionAndSubscribe(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }

  return ensurePushSubscription();
}

/** 권한이 이미 허용된 경우 구독만 보장 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return false;
  }

  try {
    const registration = await waitForServiceWorkerReady();
    if (!registration) {
      console.warn("Service Worker 미준비 — Push 구독을 건너뜁니다.");
      return false;
    }

    const { publicKey } = await pushService.getVapidPublicKey();
    if (!publicKey) {
      console.warn("VAPID 공개키가 비어 있습니다.");
      return false;
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const rawKey = subscription.getKey("p256dh");
    const rawAuth = subscription.getKey("auth");
    if (!rawKey || !rawAuth) {
      console.warn("PushSubscription 키가 없습니다.");
      return false;
    }

    await pushService.subscribe({
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64Url(rawKey),
      auth: arrayBufferToBase64Url(rawAuth),
    });

    localStorage.setItem(ENDPOINT_KEY, subscription.endpoint);
    return true;
  } catch (err) {
    console.error("Push 구독 등록 실패:", err);
    return false;
  }
}

/** 결제/주문 현황 진입 시 현재 구독을 해당 주문에 연결 */
export async function linkPushSubscriptionToOrder(orderId: string | number): Promise<void> {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return;
  }

  try {
    let endpoint = localStorage.getItem(ENDPOINT_KEY);
    if (!endpoint) {
      const ok = await ensurePushSubscription();
      if (!ok) return;
      endpoint = localStorage.getItem(ENDPOINT_KEY);
    }
    if (!endpoint) return;

    await pushService.linkOrder(endpoint, orderId);
  } catch (err) {
    console.error("Push 구독-주문 연결 실패:", err);
  }
}
