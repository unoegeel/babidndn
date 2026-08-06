import React, { useEffect, useRef, useState } from "react";

interface MarqueeTextProps {
  text: string;
  className?: string;
  /** 텍스트 자체에 적용할 클래스 (폰트 등) */
  textClassName?: string;
}

/**
 * 한 줄을 넘어가면 좌우로 순환 슬라이딩합니다.
 * 넘치지 않으면 일반 truncate 없이 그대로 표시합니다.
 */
export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = "",
  textClassName = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const label = textRef.current;
    if (!container || !label) return;

    const measure = () => {
      const delta = label.scrollWidth - container.clientWidth;
      setOverflowPx(delta > 1 ? delta : 0);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(label);
    return () => observer.disconnect();
  }, [text]);

  const isOverflow = overflowPx > 0;
  // 넘친 길이에 비례해 속도 유지 (최소 4초)
  const durationSec = Math.max(4, Math.min(12, 3 + overflowPx / 30));

  return (
    <div ref={containerRef} className={`min-w-0 overflow-hidden ${className}`}>
      <span
        ref={textRef}
        className={`inline-block max-w-none whitespace-nowrap ${textClassName} ${
          isOverflow ? "will-change-transform" : ""
        }`}
        style={
          isOverflow
            ? ({
                ["--marquee-distance" as string]: `${overflowPx}px`,
                animation: `marquee-x ${durationSec}s ease-in-out infinite`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </div>
  );
};

export default MarqueeText;
