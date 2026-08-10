/** 호출/재호출(READY) 이벤트의 FE 중복 실행 방지 + 첫 화면 배너 dismiss 해제 */

const CLAIM_KEY_PREFIX = "babi_ready_call_claimed_";
const CONFETTI_KEY_PREFIX = "babi_ready_confetti_ui_";
const BANNER_DISMISSED_KEY = "babi_ready_banner_dismissed";

/** 동일 orderId+updatedAt 조합은 한 번만 true (폴링/다중 구독 중복 방지) */
export function claimReadyCall(orderId: string, updatedAt: string): boolean {
  if (!orderId || !updatedAt) return false;
  try {
    const key = CLAIM_KEY_PREFIX + orderId;
    if (sessionStorage.getItem(key) === updatedAt) return false;
    sessionStorage.setItem(key, updatedAt);
    return true;
  } catch {
    return true;
  }
}

/** Confetti UI는 현황/완료 화면 중 한 곳에서만 실행 */
export function claimReadyConfetti(orderId: string, updatedAt: string): boolean {
  if (!orderId || !updatedAt) return false;
  try {
    const key = CONFETTI_KEY_PREFIX + orderId;
    if (sessionStorage.getItem(key) === updatedAt) return false;
    sessionStorage.setItem(key, updatedAt);
    return true;
  } catch {
    return true;
  }
}

/** 재호출 시 첫 화면 준비완료 배너가 다시 보이도록 dismiss 목록에서 제거 */
export function clearReadyBannerDismiss(orderId: string): void {
  try {
    const migrate = sessionStorage.getItem(BANNER_DISMISSED_KEY);
    if (migrate && !localStorage.getItem(BANNER_DISMISSED_KEY)) {
      localStorage.setItem(BANNER_DISMISSED_KEY, migrate);
      sessionStorage.removeItem(BANNER_DISMISSED_KEY);
    }
    const raw = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || !parsed.includes(orderId)) return;
    const next = parsed.filter((id) => id !== orderId);
    localStorage.setItem(BANNER_DISMISSED_KEY, JSON.stringify(next));
    sessionStorage.removeItem(BANNER_DISMISSED_KEY);
    window.dispatchEvent(
      new CustomEvent("babi-ready-banner-undismiss", { detail: { orderId } }),
    );
  } catch {
    // ignore
  }
}
