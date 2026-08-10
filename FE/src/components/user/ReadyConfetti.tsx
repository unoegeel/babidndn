import React, { useEffect, useMemo, useState } from "react";

const COLORS = ["#009E39", "#22c55e", "#4ade80", "#86efac", "#16a34a", "#bbf7d0"];

interface Piece {
  id: number;
  left: string;
  delay: string;
  duration: string;
  width: number;
  height: number;
  color: string;
  cx: string;
  cy: string;
  radius: string;
}

interface ReadyConfettiProps {
  active: boolean;
  /** 애니메이션 종료 후 호출 (한 번) */
  onDone?: () => void;
}

/** 초록 계열 CSS confetti — 라이브러리 없이 1회성 연출 */
export const ReadyConfetti: React.FC<ReadyConfettiProps> = ({ active, onDone }) => {
  const [visible, setVisible] = useState(active);

  const pieces = useMemo<Piece[]>(() => {
    return Array.from({ length: 42 }, (_, i) => {
      const drift = (Math.random() - 0.5) * 160;
      const width = 6 + Math.floor(Math.random() * 7);
      return {
        id: i,
        left: `${8 + Math.random() * 84}%`,
        delay: `${Math.random() * 0.35}s`,
        duration: `${2.2 + Math.random() * 1.4}s`,
        width,
        height: width * (0.55 + Math.random() * 0.7),
        color: COLORS[i % COLORS.length],
        cx: `${drift}px`,
        cy: `${95 + Math.random() * 30}vh`,
        radius: Math.random() > 0.45 ? "1px" : "50%",
      };
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3800);
    return () => window.clearTimeout(timer);
  }, [active, onDone]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[80] overflow-hidden"
      aria-hidden
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-12px] block"
          style={
            {
              left: p.left,
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              borderRadius: p.radius,
              ["--cx" as string]: p.cx,
              ["--cy" as string]: p.cy,
              animation: `confetti-fall ${p.duration} cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay} both`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default ReadyConfetti;
