import type { ClientEventType } from "../../types/clientEvent";

/** StrictMode/effect 재실행으로 중복될 수 있는 view 이벤트만 짧게 억제 */
const VIEW_DEDUPE_WINDOW_MS = 5000;
const recentViewKeys = new Map<string, number>();

export function shouldSuppressViewEvent(
  eventType: ClientEventType,
  dedupeKey: string,
  now = Date.now(),
): boolean {
  if (eventType !== "MENU_VIEW"
    && eventType !== "ORDER_STATUS_VIEW"
    && eventType !== "SAVED_MENU_VIEW") {
    return false;
  }

  const key = `${eventType}|${dedupeKey}`;
  const lastSent = recentViewKeys.get(key);
  if (lastSent != null && now - lastSent < VIEW_DEDUPE_WINDOW_MS) {
    return true;
  }
  recentViewKeys.set(key, now);
  return false;
}

export function resetViewEventDedupeForTests(): void {
  recentViewKeys.clear();
}
