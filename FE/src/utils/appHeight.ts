/** 브라우저 UI(상·하단 바)를 제외한 실제 가시 높이를 --app-height 로 동기화 */

/**
 * 주소창 변화는 보통 수십 px, 키보드는 그보다 훨씬 크다.
 * innerHeight(레이아웃)와 visualViewport.height(가시 영역) 차이가 이 값보다 크고
 * 입력 요소에 포커스가 있으면 키보드 overlay로 본다.
 */
const KEYBOARD_OCCLUSION_MIN_PX = 150;

/** 키보드가 없을 때 마지막으로 반영한 앱 높이 */
let lastAppliedHeight: number | null = null;

function visualViewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

function isEditableFocused(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || el === document.body || el === document.documentElement) {
    return false;
  }
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

function isHeavilyOccluded(layoutHeight: number, visibleHeight: number): boolean {
  return layoutHeight - visibleHeight > KEYBOARD_OCCLUSION_MIN_PX;
}

/** 키보드가 레이아웃은 유지한 채 가시 영역만 가리고 있는지 */
function isKeyboardOccluding(layoutHeight: number, visibleHeight: number): boolean {
  return isEditableFocused() && isHeavilyOccluded(layoutHeight, visibleHeight);
}

function applyAppHeight(heightPx: number): void {
  const rounded = Math.round(heightPx);
  lastAppliedHeight = rounded;
  document.documentElement.style.setProperty("--app-height", `${rounded}px`);
}

/**
 * @param force 화면 회전처럼 레이아웃 기준 자체가 바뀐 경우.
 *   키보드가 열려 있으면 visualViewport가 줄어 있으므로 innerHeight를 쓴다.
 */
function syncAppHeight(force = false): void {
  const visible = visualViewportHeight();
  const layout = window.innerHeight;

  if (!force && isKeyboardOccluding(layout, visible)) {
    return;
  }

  // 포커스는 빠졌지만 키보드 닫힘 애니메이션이 남은 경우 — 직전 높이 유지
  if (!force && lastAppliedHeight != null && isHeavilyOccluded(layout, visible)) {
    return;
  }

  applyAppHeight(force && isKeyboardOccluding(layout, visible) ? layout : visible);
}

/** 앱 시작 시 가시 높이 동기화를 걸고, 해제 함수를 반환합니다. */
export function startAppHeightSync(): () => void {
  syncAppHeight();

  const onResize = () => syncAppHeight();
  const onOrientationChange = () => syncAppHeight(true);

  window.visualViewport?.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("scroll", onResize);
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onOrientationChange);
  document.addEventListener("focusin", onResize);
  document.addEventListener("focusout", onResize);

  return () => {
    window.visualViewport?.removeEventListener("resize", onResize);
    window.visualViewport?.removeEventListener("scroll", onResize);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", onOrientationChange);
    document.removeEventListener("focusin", onResize);
    document.removeEventListener("focusout", onResize);
  };
}
