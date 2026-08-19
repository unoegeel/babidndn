import { getClientKey } from "../clientKey";
import type { ClientEventPayload, TrackEventInput } from "../../types/clientEvent";
import {
  sanitizeMetadata,
  sanitizeRelatedRequestId,
  sanitizeRoute,
} from "./sanitizeMetadata";
import { sendClientEvent } from "./sendClientEvent";
import { getSessionId } from "./sessionId";
import { shouldSuppressViewEvent } from "./viewDedupe";

function createEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveRoute(route?: string): string {
  if (route && route.trim()) {
    return sanitizeRoute(route);
  }
  if (typeof window !== "undefined") {
    return sanitizeRoute(window.location.pathname);
  }
  return "/";
}

function buildViewDedupeKey(type: TrackEventInput["type"], metadata?: TrackEventInput["metadata"]): string {
  if (type === "MENU_VIEW") {
    return String(metadata?.menuId ?? "unknown");
  }
  if (type === "ORDER_STATUS_VIEW" || type === "ORDER_COMPLETED") {
    return String(metadata?.orderId ?? "unknown");
  }
  if (type === "SAVED_MENU_VIEW") {
    return "page";
  }
  return "default";
}

/** User Event를 fire-and-forget으로 Backend에 전송 */
export function trackEvent(input: TrackEventInput): void {
  try {
    const metadata = sanitizeMetadata(input.metadata);
    const dedupeKey = buildViewDedupeKey(input.type, metadata);
    if (shouldSuppressViewEvent(input.type, dedupeKey)) {
      return;
    }

    const payload: ClientEventPayload = {
      eventId: createEventId(),
      eventType: input.type,
      timestamp: new Date().toISOString(),
      anonymousId: getClientKey(),
      sessionId: getSessionId(),
      route: resolveRoute(input.route),
    };

    const relatedRequestId = sanitizeRelatedRequestId(input.relatedRequestId);
    if (relatedRequestId) {
      payload.relatedRequestId = relatedRequestId;
    }
    if (metadata) {
      payload.metadata = metadata;
    }

    sendClientEvent(payload);
  } catch {
    // tracking 실패는 서비스 기능에 영향을 주지 않음
  }
}

/** 테스트용 payload builder */
export function buildClientEventPayloadForTest(input: TrackEventInput): ClientEventPayload {
  return {
    eventId: createEventId(),
    eventType: input.type,
    timestamp: new Date().toISOString(),
    anonymousId: getClientKey(),
    sessionId: getSessionId(),
    route: resolveRoute(input.route),
    relatedRequestId: sanitizeRelatedRequestId(input.relatedRequestId),
    metadata: sanitizeMetadata(input.metadata),
  };
}
