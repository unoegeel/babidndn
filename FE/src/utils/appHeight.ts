/** 브라우저 UI(상·하단 바)를 제외한 실제 가시 높이를 --app-height 로 동기화 */
function syncAppHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
}

/** 앱 시작 시 가시 높이 동기화를 걸고, 해제 함수를 반환합니다. */
export function startAppHeightSync(): () => void {
  syncAppHeight();

  const onResize = () => syncAppHeight();
  window.visualViewport?.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("scroll", onResize);
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

  return () => {
    window.visualViewport?.removeEventListener("resize", onResize);
    window.visualViewport?.removeEventListener("scroll", onResize);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", onResize);
  };
}
