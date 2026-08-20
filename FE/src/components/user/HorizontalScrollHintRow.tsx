import React, { useCallback, useLayoutEffect, useRef, useState } from "react";

const SCROLL_EPSILON = 2;

type ScrollHintState = {
  isScrollable: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

function measureScrollHints(el: HTMLElement): ScrollHintState {
  const { scrollLeft, clientWidth, scrollWidth } = el;
  const isScrollable = scrollWidth > clientWidth + SCROLL_EPSILON;
  return {
    isScrollable,
    canScrollLeft: isScrollable && scrollLeft > SCROLL_EPSILON,
    canScrollRight: isScrollable && scrollLeft + clientWidth < scrollWidth - SCROLL_EPSILON,
  };
}

function ScrollEdgeHint({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 z-10 flex w-8 items-center ${
        isLeft ? "left-0 justify-start" : "right-0 justify-end"
      }`}
    >
      <div
        className={`absolute inset-y-0 w-10 ${
          isLeft
            ? "bg-gradient-to-r from-[#F8F9FA] via-[#F8F9FA]/70 to-transparent"
            : "bg-gradient-to-l from-[#F8F9FA] via-[#F8F9FA]/70 to-transparent"
        } ${isLeft ? "left-0" : "right-0"}`}
      />
      <span
        className={`relative text-[12px] font-semibold leading-none text-gray-300 ${
          isLeft ? "pl-0.5" : "pr-0.5"
        }`}
      >
        {isLeft ? "‹" : "›"}
      </span>
    </div>
  );
}

type HorizontalScrollHintRowProps = {
  children: React.ReactNode;
  /** 콘텐츠/메뉴 변경 시 scroll 측정을 다시 트리거 */
  measureKey: string | number;
};

/** overflow-x-auto 행 — 실제 overflow가 있을 때만 좌/우 edge 힌트 overlay */
export function HorizontalScrollHintRow({ children, measureKey }: HorizontalScrollHintRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hints, setHints] = useState<ScrollHintState>({
    isScrollable: false,
    canScrollLeft: false,
    canScrollRight: false,
  });

  const updateHints = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const next = measureScrollHints(el);
    setHints((prev) =>
      prev.isScrollable === next.isScrollable
      && prev.canScrollLeft === next.canScrollLeft
      && prev.canScrollRight === next.canScrollRight
        ? prev
        : next,
    );
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateHints();

    el.addEventListener("scroll", updateHints, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => updateHints());
      ro.observe(el);
      if (el.firstElementChild instanceof Element) {
        ro.observe(el.firstElementChild);
      }
    }

    window.addEventListener("resize", updateHints);

    return () => {
      el.removeEventListener("scroll", updateHints);
      ro?.disconnect();
      window.removeEventListener("resize", updateHints);
    };
  }, [updateHints, measureKey]);

  return (
    <div className="relative -mx-1.5">
      <div
        ref={scrollRef}
        className="overflow-x-auto px-1.5 pb-1.5 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {hints.isScrollable && hints.canScrollLeft && <ScrollEdgeHint side="left" />}
      {hints.isScrollable && hints.canScrollRight && <ScrollEdgeHint side="right" />}
    </div>
  );
}
