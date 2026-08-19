import { useEffect, type RefObject } from "react";

/** input 하단과 가시 영역 하단 사이 여백 */
const INPUT_SAFE_MARGIN_PX = 12;
/** 카드 상단이 visualViewport 밖으로 나가지 않게 하는 여백 */
const CARD_TOP_MARGIN_PX = 8;

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

    input.focus({ preventScroll: true });

    const ancestor = closestOverflowYAncestor(overlay);
    const savedScrollTop = ancestor?.scrollTop ?? 0;
    const viewport = window.visualViewport;
    let currentShift = 0;
    let rafId = 0;

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
      const cardRect = card.getBoundingClientRect();
      const untransformedInputBottom = inputRect.bottom - currentShift;
      const untransformedCardTop = cardRect.top - currentShift;

      const overlap = untransformedInputBottom - (visualViewportBottom - INPUT_SAFE_MARGIN_PX);
      let nextShift = overlap > 0 ? -overlap : 0;

      const minShift = offsetTop + CARD_TOP_MARGIN_PX - untransformedCardTop;
      if (nextShift < minShift) {
        nextShift = Math.min(0, minShift);
      }

      applyShift(nextShift);
    };

    const scheduleUpdate = () => {
      restoreAncestorScroll();
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateCardPosition();
      });
    };

    ancestor?.addEventListener("scroll", scheduleUpdate, { passive: true });
    viewport?.addEventListener("resize", scheduleUpdate);
    viewport?.addEventListener("scroll", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);
    document.addEventListener("focusin", scheduleUpdate);

    scheduleUpdate();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      applyShift(0);
      ancestor?.removeEventListener("scroll", scheduleUpdate);
      viewport?.removeEventListener("resize", scheduleUpdate);
      viewport?.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      document.removeEventListener("focusin", scheduleUpdate);
    };
  }, [overlayRef, cardRef, inputRef]);
}
