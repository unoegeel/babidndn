import React, { useEffect, useMemo, useRef, useState } from "react";

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
  sway1: string;
  sway2: string;
  sway3: string;
  cx2: string;
  peakY: string;
  fallY: string;
  spinMid: string;
  spinEnd: string;
  radius: string;
}

interface ReadyConfettiProps {
  active: boolean;
  /**
   * 동일 active=true 유지 중에도 값이 바뀌면 1회 재발사 (관리자 재호출 등).
   * claimReadyConfetti에 쓰는 updatedAt을 넘기면 SSE/폴링 중복과 구분됨.
   */
  playKey?: string;
  /** 애니메이션 종료 후 호출 (한 번) */
  onDone?: () => void;
}

/** Strict Mode 리마운트·effect 재실행에도 동일 playKey 발사를 한 번만 허용 */
let lastModulePlayKey: string | null = null;

/** 다색 confetti — 하단 폭죽 발사 후 천천히 살랑거리며 낙하 (CSS only) */
export const ReadyConfetti: React.FC<ReadyConfettiProps> = ({ active, playKey, onDone }) => {
  const [visible, setVisible] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const pieces = useMemo<Piece[]>(() => {
    return Array.from({ length: 44 }, (_, i) => {
      const origin = ORIGINS[i % ORIGINS.length];
      const drift = (Math.random() - 0.5) * (130 + Math.random() * 90);
      const swayAmp = 18 + Math.random() * 42;
      const dir = Math.random() > 0.5 ? 1 : -1;
      const width = 5 + Math.floor(Math.random() * 7);
      const peak = -(34 + Math.random() * 38);
      // 시작점(bottom)보다 아래로 충분히 내려가며 천천히 사라짐
      const fall = 35 + Math.random() * 45;
      const spin = 160 + Math.random() * 380;
      return {
        id: i,
        left: `${origin + (Math.random() - 0.5) * 10}%`,
        delay: `${Math.random() * 0.22}s`,
        // 낙하 구간이 길도록 전체 시간을 충분히 확보
        duration: `${5.2 + Math.random() * 2.6}s`,
        width,
        height: width * (0.5 + Math.random() * 0.9),
        color: COLORS[i % COLORS.length],
        cx: `${drift}px`,
        sway1: `${drift + dir * swayAmp}px`,
        sway2: `${drift - dir * swayAmp * (0.6 + Math.random() * 0.5)}px`,
        sway3: `${drift + dir * swayAmp * (0.35 + Math.random() * 0.4)}px`,
        cx2: `${drift + (Math.random() - 0.5) * 50}px`,
        peakY: `${peak}vh`,
        fallY: `${fall}vh`,
        spinMid: `${spin * 0.35}deg`,
        spinEnd: `${spin}deg`,
        radius: Math.random() > 0.4 ? "1px" : "50%",
      };
    });
  }, [burstKey]);

  useEffect(() => {
    if (!active) {
      lastModulePlayKey = null;
      setVisible(false);
      return;
    }

    const key = playKey && playKey.length > 0 ? playKey : "__active__";
    const isSamePlay = lastModulePlayKey === key;

    if (!isSamePlay) {
      lastModulePlayKey = key;
      setBurstKey((k) => k + 1);
    }

    setVisible(true);

    // 조각 duration 최대(~7.8s) + delay 여유
    const timer = window.setTimeout(() => {
      setVisible(false);
      if (lastModulePlayKey === key) {
        lastModulePlayKey = null;
      }
      onDoneRef.current?.();
    }, 8200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [active, playKey]);

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
              ["--sway1" as string]: p.sway1,
              ["--sway2" as string]: p.sway2,
              ["--sway3" as string]: p.sway3,
              ["--cx2" as string]: p.cx2,
              ["--peak-y" as string]: p.peakY,
              ["--fall-y" as string]: p.fallY,
              ["--spin-mid" as string]: p.spinMid,
              ["--spin-end" as string]: p.spinEnd,
              // linear: 키프레임 %로 상승(짧게)·낙하(길게) 타이밍 제어
              animation: `confetti-burst ${p.duration} linear ${p.delay} both`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default ReadyConfetti;
