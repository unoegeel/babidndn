import { useEffect, type RefObject } from "react";

/** input 하단 여백 최소값 */
const INPUT_SAFE_MARGIN_MIN_PX = 16;

function closestOverflowYAncestor(start: HTMLElement | null): HTMLElement | null {
  let node = start?.parentElement ?? null;
  while (node && node !== document.body && node !== document.documentElement) {
    const overflowY = window.getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "hidden" || overflowY === "overlay") {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** input 필드 높이 기반 여백 — 고정 키보드 px가 아님 */
function inputSafeMargin(inputHeight: number): number {
  return Math.max(INPUT_SAFE_MARGIN_MIN_PX, Math.round(inputHeight * 0.35));
}

/**
 * 나만의 메뉴 등록/수정 팝업: 페이지는 고정하고, input이 가려질 때만 카드만 올린다.
 */
export function useSavedMenuPopupKeyboard({
  overlayRef,
  cardRef,
  inputRef,
}: {
  overlayRef: RefObject<HTMLElement | null>;
  cardRef: RefObject<HTMLElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
}): void {
  useEffect(() => {
    const overlay = overlayRef.current;
    const card = cardRef.current;
    const input = inputRef.current;
    if (!overlay || !card || !input) return;

    const ancestor = closestOverflowYAncestor(overlay);
    const savedScrollTop = ancestor?.scrollTop ?? 0;
    const viewport = window.visualViewport;
    let currentShift = 0;
    let rafId = 0;
    let followUpTimer: ReturnType<typeof setTimeout> | undefined;

    const applyShift = (next: number) => {
      const rounded = Math.round(next);
      if (rounded === currentShift) return;
      currentShift = rounded;
      card.style.transform = rounded === 0 ? "" : `translateY(${rounded}px)`;
    };

    const restoreAncestorScroll = () => {
      if (!ancestor) return;
      if (ancestor.scrollTop !== savedScrollTop) {
        ancestor.scrollTop = savedScrollTop;
      }
    };

    const updateCardPosition = () => {
      restoreAncestorScroll();

      const visibleHeight = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const visualViewportBottom = offsetTop + visibleHeight;

      const inputRect = input.getBoundingClientRect();
      const safeMargin = inputSafeMargin(input.offsetHeight);
      const untransformedInputBottom = inputRect.bottom - currentShift;

      const overlap = untransformedInputBottom - (visualViewportBottom - safeMargin);
      const nextShift = overlap > 0 ? -overlap : 0;

      applyShift(nextShift);
    };

    const scheduleUpdate = (withFollowUp = false) => {
      if (withFollowUp) {
        if (followUpTimer) clearTimeout(followUpTimer);
        followUpTimer = setTimeout(() => {
          followUpTimer = undefined;
          updateCardPosition();
        }, 150);
      }

      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateCardPosition();
      });
    };

    /** 최초 자동 focus와 재탭 focus가 동일하게 거치는 진입점 */
    const syncCardPosition = () => scheduleUpdate(true);

    const onViewportChange = () => syncCardPosition();

    viewport?.addEventListener("resize", onViewportChange);
    viewport?.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    input.addEventListener("focus", syncCardPosition);

    input.focus({ preventScroll: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (followUpTimer) clearTimeout(followUpTimer);
      applyShift(0);
      viewport?.removeEventListener("resize", onViewportChange);
      viewport?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      input.removeEventListener("focus", syncCardPosition);
    };
  }, [overlayRef, cardRef, inputRef]);
}
