import { resolveApiBaseUrl } from "../../api/client";
import type { ClientErrorPayload } from "../../types/clientError";
import { CLIENT_ERROR_API_PATH } from "../../types/clientError";

/** tracking API 자체는 error tracking 대상에서 제외 */
export const CLIENT_ERROR_TRACKING_MARKER = "__babiClientErrorTrackingRequest";

/**
 * client-errors 전송 전용 fetch.
 * api client를 사용하지 않아 tracking 실패 loop를 방지합니다.
 */
export function sendClientError(payload: ClientErrorPayload): void {
  const root = resolveApiBaseUrl();
  const url = `${root}${CLIENT_ERROR_API_PATH}`;

  const body = JSON.stringify(payload);
  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  };

  Object.defineProperty(requestInit, CLIENT_ERROR_TRACKING_MARKER, {
    value: true,
    enumerable: false,
  });

  void fetch(url, requestInit).catch(() => {
    // tracking 실패는 무시 — 추가 reporting 금지
  });
}

export function isClientErrorTrackingRequest(input: unknown): boolean {
  return typeof input === "object"
    && input !== null
    && CLIENT_ERROR_TRACKING_MARKER in input;
}
