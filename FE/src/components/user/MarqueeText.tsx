import React, { useEffect, useRef, useState } from "react";

interface MarqueeTextProps {
  text: string;
  className?: string;
  /** 텍스트 자체에 적용할 클래스 (폰트 등) */
  textClassName?: string;
}

/**
 * 한 줄을 넘어가면 오른쪽→왼쪽으로 천천히 스크롤한 뒤
 * 처음으로 되돌아가 반복합니다. 넘치지 않으면 애니메이션 없음.
 */
export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = "",
  textClassName = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const label = measureRef.current;
    if (!container || !label) return;

    const measure = () => {
      const width = label.scrollWidth;
      const delta = width - container.clientWidth;
      setTextWidth(width);
      setOverflowPx(delta > 1 ? delta : 0);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(label);
    return () => observer.disconnect();
  }, [text]);

  const isOverflow = overflowPx > 0;
  const gapPx = 48;
  // 읽을 수 있도록 느리게 (최소 ~10초, 길이에 비례)
  const durationSec = Math.max(10, Math.min(28, 8 + overflowPx / 18));
  // 본문+간격만큼 이동하면 복제본이 시작 위치에 맞춰짐
  const loopDistance = textWidth + gapPx;

  return (
    <div ref={containerRef} className={`relative min-w-0 overflow-hidden ${className}`}>
      <span
        ref={measureRef}
        className={`pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap ${textClassName}`}
        aria-hidden
      >
        {text}
      </span>

      {isOverflow ? (
        <div
          className="flex w-max will-change-transform"
          style={
            {
              ["--marquee-distance" as string]: `${loopDistance}px`,
              animation: `marquee-x ${durationSec}s linear infinite`,
            } as React.CSSProperties
          }
        >
          <span className={`inline-block max-w-none whitespace-nowrap ${textClassName}`}>
            {text}
          </span>
          <span
            className={`inline-block max-w-none whitespace-nowrap ${textClassName}`}
            style={{ paddingLeft: gapPx }}
            aria-hidden
          >
            {text}
          </span>
        </div>
      ) : (
        <span className={`inline-block max-w-none whitespace-nowrap ${textClassName}`}>
          {text}
        </span>
      )}
    </div>
  );
};

export default MarqueeText;
