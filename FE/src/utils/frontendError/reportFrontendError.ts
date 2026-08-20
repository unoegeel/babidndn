import type { ClientErrorPayload, FrontendErrorInput } from "../../types/clientError";
import { FRONTEND_TO_BACKEND_SOURCE } from "../../types/clientError";
import { ApiError } from "../../api/client";
import { detectBrowserInfo } from "./browserInfo";
import { buildErrorFingerprint, shouldSuppressDuplicate } from "./dedupe";
import { normalizeErrorEvent, normalizeUnknownError } from "./normalizeError";
import {
  sanitizeOptionalText,
  sanitizeRelatedRequestId,
  sanitizeRoute,
  sanitizeText,
} from "./sanitize";
import { sendClientError } from "./sendClientError";

function resolveRoute(route?: string): string {
  if (route && route.trim() !== "") {
    return sanitizeRoute(route);
  }
  if (typeof window !== "undefined") {
    return sanitizeRoute(window.location.pathname);
  }
  return "/";
}

function buildPayload(input: FrontendErrorInput): ClientErrorPayload | null {
  const normalized = input.error !== undefined
    ? normalizeErrorEvent(input.error, input.message)
    : {
        errorName: input.errorName ?? "Error",
        message: input.message ?? "Unknown error",
        stack: input.stack,
        relatedRequestId: input.relatedRequestId,
      };

  const route = resolveRoute(input.route);
  const errorName = sanitizeText(input.errorName ?? normalized.errorName, 200);
  const message = sanitizeText(input.message ?? normalized.message, 2000);
  const fingerprint = buildErrorFingerprint(input.source, route, errorName, message);

  if (shouldSuppressDuplicate(fingerprint)) {
    return null;
  }

  const browserInfo = detectBrowserInfo();
  const relatedRequestId = sanitizeRelatedRequestId(
    input.relatedRequestId ?? normalized.relatedRequestId,
  );

  const payload: ClientErrorPayload = {
    timestamp: new Date().toISOString(),
    source: FRONTEND_TO_BACKEND_SOURCE[input.source],
    errorName,
    message,
    route,
  };

  const stack = sanitizeOptionalText(input.stack ?? normalized.stack, 8000);
  if (stack) payload.stack = stack;

  const componentStack = sanitizeOptionalText(input.componentStack, 8000);
  if (componentStack) payload.componentStack = componentStack;

  if (relatedRequestId) payload.relatedRequestId = relatedRequestId;

  const userAgent = sanitizeOptionalText(browserInfo.userAgent, 500);
  if (userAgent) payload.userAgent = userAgent;

  const browser = sanitizeOptionalText(browserInfo.browser, 100);
  if (browser) payload.browser = browser;

  const platform = sanitizeOptionalText(browserInfo.platform, 100);
  if (platform) payload.platform = platform;

  return payload;
}

/** Frontend runtime/react/api 오류를 Backend structured log로 전송 */
export function reportFrontendError(input: FrontendErrorInput): void {
  try {
    const payload = buildPayload(input);
    if (!payload) {
      return;
    }
    sendClientError(payload);
  } catch {
    // reporter 실패는 앱 동작에 영향을 주지 않음
  }
}

/** unhandledrejection에서 HTTP API business/server error는 제외 */
export function shouldReportUnhandledRejection(reason: unknown): boolean {
  return !(reason instanceof ApiError);
}

/** window error event 처리 */
export function reportWindowError(event: ErrorEvent): void {
  const error = event.error instanceof Error
    ? event.error
    : new Error(event.message || "Script error");
  reportFrontendError({
    source: "window",
    error,
    message: event.message || error.message,
  });
}

/** unhandled promise rejection 처리 */
export function reportUnhandledRejection(event: PromiseRejectionEvent): void {
  if (!shouldReportUnhandledRejection(event.reason)) {
    return;
  }
  const normalized = normalizeUnknownError(event.reason);
  reportFrontendError({
    source: "unhandledrejection",
    errorName: normalized.errorName,
    message: normalized.message,
    stack: normalized.stack,
    relatedRequestId: normalized.relatedRequestId,
  });
}

/** API response JSON parse 등 client 내부 runtime failure */
export function reportApiProcessingError(error: unknown, relatedRequestId?: string): void {
  reportFrontendError({
    source: "api",
    error,
    relatedRequestId,
  });
}
