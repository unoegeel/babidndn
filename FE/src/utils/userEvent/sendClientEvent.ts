import { resolveApiBaseUrl } from "../../api/client";
import type { ClientEventPayload } from "../../types/clientEvent";
import { CLIENT_EVENT_API_PATH } from "../../types/clientEvent";

export const CLIENT_EVENT_TRACKING_MARKER = "__babiClientEventTrackingRequest";

/** User Event 전송 전용 fetch — error/event tracking loop 방지 */
export function sendClientEvent(payload: ClientEventPayload): void {
  const root = resolveApiBaseUrl();
  const url = `${root}${CLIENT_EVENT_API_PATH}`;

  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  };

  Object.defineProperty(requestInit, CLIENT_EVENT_TRACKING_MARKER, {
    value: true,
    enumerable: false,
  });

  void fetch(url, requestInit).catch(() => {
    // tracking 실패는 무시
  });
}

export function isClientEventTrackingRequest(input: unknown): boolean {
  return typeof input === "object"
    && input !== null
    && CLIENT_EVENT_TRACKING_MARKER in input;
}
