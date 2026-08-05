/**
 * Workbox 생성 SW에 합쳐지는 Web Push 핸들러.
 * vite-plugin-pwa workbox.importScripts 로 로드됩니다.
 */
/* eslint-disable no-undef */
self.addEventListener("push", (event) => {
  let data = {
    title: "바비든든",
    body: "주문이 준비되었습니다. 카운터에서 픽업해 주세요.",
    orderId: null,
    type: "READY",
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch {
      // ignore
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "바비든든", {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data,
      tag: data.orderId ? `order-ready-${data.orderId}` : "order-ready",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const orderId = event.notification.data && event.notification.data.orderId;
  const targetUrl = orderId
    ? `/user/orders/${orderId}/complete`
    : "/user";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && client.url.includes("/user")) {
          client.focus();
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
          return undefined;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
