import { reportWindowError, reportUnhandledRejection } from "./reportFrontendError";

let initialized = false;

/** Global JS error / unhandledrejection 리스너 등록 (1회) */
export function initFrontendErrorTracking(): void {
  if (initialized || typeof window === "undefined") {
    return;
  }
  initialized = true;

  window.addEventListener("error", (event) => {
    reportWindowError(event);
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportUnhandledRejection(event);
  });
}

/** 테스트용 초기화 상태 리셋 */
export function resetFrontendErrorTrackingState(): void {
  initialized = false;
}
