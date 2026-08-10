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

interface Piece {
  id: number;
  delay: string;
  duration: string;
  width: number;
  height: number;
  color: string;
  /** 발사 직후 살짝만 벌어짐 (기둥처럼 상승) */
  launchX: string;
  launchY: string;
  /** 상승 중 벌어지기 시작 */
  openX: string;
  openY: string;
  /** 상단 폭발 지점 X (넓게 확산) */
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

/** 다색 confetti — 하단 중앙 폭죽 발사 → 상단 확산 → 천천히 살랑거리며 낙하 */
export const ReadyConfetti: React.FC<ReadyConfettiProps> = ({ active, playKey, onDone }) => {
  const [visible, setVisible] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const pieces = useMemo<Piece[]>(() => {
    return Array.from({ length: 48 }, (_, i) => {
      // 상단 전체를 쓰도록 좌우로 넓게 퍼지되, 높이·각도는 조각마다 다르게
      const angleBias = (i / 47) * 2 - 1; // -1 … 1 균등 분배 후 랜덤 섞음
      const spread = (angleBias * 0.55 + (Math.random() - 0.5) * 0.9) * 92;
      const burstXVw = Math.max(-48, Math.min(48, spread));
      // 일부는 상단 가까이, 일부는 조금 낮은 폭발점
      const peak = -(62 + Math.random() * 34); // -62vh … -96vh
      const launchY = peak * (0.42 + Math.random() * 0.12); // 상승 중반 (아직 좁게)
      const launchX = burstXVw * (0.08 + Math.random() * 0.1);
      const openX = burstXVw * (0.4 + Math.random() * 0.12);
      const openY = peak * (0.78 + Math.random() * 0.08);

      const swayAmp = 2.2 + Math.random() * 4.5; // vw
      const dir = Math.random() > 0.5 ? 1 : -1;
      const width = 5 + Math.floor(Math.random() * 7);
      const fall = 28 + Math.random() * 48;
      const spin = 160 + Math.random() * 380;

      return {
        id: i,
        // 한 폭죽처럼 거의 동시에 발사
        delay: `${Math.random() * 0.06}s`,
        duration: `${5.2 + Math.random() * 2.6}s`,
        width,
        height: width * (0.5 + Math.random() * 0.9),
        color: COLORS[i % COLORS.length],
        launchX: `${launchX}vw`,
        launchY: `${launchY}vh`,
        openX: `${openX}vw`,
        openY: `${openY}vh`,
        cx: `${burstXVw}vw`,
        sway1: `${burstXVw + dir * swayAmp}vw`,
        sway2: `${burstXVw - dir * swayAmp * (0.55 + Math.random() * 0.45)}vw`,
        sway3: `${burstXVw + dir * swayAmp * (0.3 + Math.random() * 0.4)}vw`,
        cx2: `${burstXVw + (Math.random() - 0.5) * 8}vw`,
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
          className="absolute bottom-[3%] left-1/2 block will-change-transform"
          style={
            {
              width: p.width,
              height: p.height,
              marginLeft: -p.width / 2,
              backgroundColor: p.color,
              borderRadius: p.radius,
              ["--launch-x" as string]: p.launchX,
              ["--launch-y" as string]: p.launchY,
              ["--open-x" as string]: p.openX,
              ["--open-y" as string]: p.openY,
              ["--cx" as string]: p.cx,
              ["--sway1" as string]: p.sway1,
              ["--sway2" as string]: p.sway2,
              ["--sway3" as string]: p.sway3,
              ["--cx2" as string]: p.cx2,
              ["--peak-y" as string]: p.peakY,
              ["--fall-y" as string]: p.fallY,
              ["--spin-mid" as string]: p.spinMid,
              ["--spin-end" as string]: p.spinEnd,
              animation: `confetti-burst ${p.duration} linear ${p.delay} both`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

export default ReadyConfetti;
