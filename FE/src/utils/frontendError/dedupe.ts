import type { FrontendErrorSource } from "../../types/clientError";
import { sanitizeRoute, sanitizeText } from "./sanitize";

const DEDUPE_WINDOW_MS = 3000;
const recentFingerprints = new Map<string, number>();

export function buildErrorFingerprint(
  source: FrontendErrorSource,
  route: string,
  errorName: string,
  message: string,
): string {
  return [
    source,
    sanitizeRoute(route),
    sanitizeText(errorName, 200),
    sanitizeText(message, 500),
  ].join("|");
}

export function shouldSuppressDuplicate(fingerprint: string, now = Date.now()): boolean {
  const lastSent = recentFingerprints.get(fingerprint);
  if (lastSent != null && now - lastSent < DEDUPE_WINDOW_MS) {
    return true;
  }
  recentFingerprints.set(fingerprint, now);
  return false;
}

/** 테스트용 dedupe 상태 초기화 */
export function resetErrorDedupeState(): void {
  recentFingerprints.clear();
}
