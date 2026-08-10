import React, { useEffect, useMemo, useState } from "react";

const COLORS = [
  "#22c55e",
  "#84cc16",
  "#eab308",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#3b82f6",
  "#06b6d4",
  "#14b8a6",
  "#fbbf24",
];

/** 하단 발사 지점 (폭죽처럼 여러 곳에서) */
const ORIGINS = [18, 35, 50, 65, 82];

interface Piece {
  id: number;
  left: string;
  delay: string;
  duration: string;
  width: number;
  height: number;
  color: string;
  cx: string;
  cx2: string;
  peakY: string;
  fallY: string;
  spinMid: string;
  spinEnd: string;
  radius: string;
  easing: string;
}

interface ReadyConfettiProps {
  active: boolean;
  /** 애니메이션 종료 후 호출 (한 번) */
  onDone?: () => void;
}

/** 다색 confetti — 하단에서 솟아오른 뒤 낙하 (CSS only) */
export const ReadyConfetti: React.FC<ReadyConfettiProps> = ({ active, onDone }) => {
  const [visible, setVisible] = useState(active);
  const [burstKey, setBurstKey] = useState(0);

  const pieces = useMemo<Piece[]>(() => {
    return Array.from({ length: 48 }, (_, i) => {
      const origin = ORIGINS[i % ORIGINS.length];
      const drift = (Math.random() - 0.5) * (140 + Math.random() * 100);
      const drift2 = drift + (Math.random() - 0.5) * 80;
      const width = 5 + Math.floor(Math.random() * 7);
      const peak = -(32 + Math.random() * 42); // vh — 위로
      const fall = 8 + Math.random() * 28; // vh — 시작점 대비 아래로
      const spin = 200 + Math.random() * 400;
      return {
        id: i,
        left: `${origin + (Math.random() - 0.5) * 10}%`,
        delay: `${Math.random() * 0.22}s`,
        duration: `${1.9 + Math.random() * 1.3}s`,
        width,
        height: width * (0.5 + Math.random() * 0.9),
        color: COLORS[i % COLORS.length],
        cx: `${drift}px`,
        cx2: `${drift2}px`,
        peakY: `${peak}vh`,
        fallY: `${fall}vh`,
        spinMid: `${spin * 0.4}deg`,
        spinEnd: `${spin}deg`,
        radius: Math.random() > 0.4 ? "1px" : "50%",
        easing:
          Math.random() > 0.5
            ? "cubic-bezier(0.15, 0.85, 0.35, 1)"
            : "cubic-bezier(0.2, 0.7, 0.3, 1)",
      };
    });
    // burstKey로 재호출 시 조각 배치를 새로 뽑음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey]);

  useEffect(() => {
    if (!active) return;
    setBurstKey((k) => k + 1);
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3600);
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
          key={`${burstKey}-${p.id}`}
          className="absolute bottom-[4%] block will-change-transform"
          style={
            {
              left: p.left,
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              borderRadius: p.radius,
              ["--cx" as string]: p.cx,
              ["--cx2" as string]: p.cx2,
              ["--peak-y" as string]: p.peakY,
              ["--fall-y" as string]: p.fallY,
              ["--spin-mid" as string]: p.spinMid,
              ["--spin-end" as string]: p.spinEnd,
              animation: `confetti-burst ${p.duration} ${p.easing} ${p.delay} both`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default ReadyConfetti;
