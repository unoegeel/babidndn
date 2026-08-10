import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

/** 상승(0.5s) + 낙하 최대(7.4s) + 여유 */
const CONFETTI_TOTAL_MS = 9000;
/** 모든 조각이 동시에 끝나는 상승 구간 (초) — delay 없음 */
const RISE_MS = 0.5;

interface Piece {
  id: number;
  fallDuration: string;
  width: number;
  height: number;
  color: string;
  launchX: string;
  launchY: string;
  openX: string;
  openY: string;
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

/** 다색 confetti — viewport 하단 중앙 동시 폭죽 → 상단 확산 → 천천히 낙하 (body Portal) */
export const ReadyConfetti: React.FC<ReadyConfettiProps> = ({ active, playKey, onDone }) => {
  const [visible, setVisible] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const pieces = useMemo<Piece[]>(() => {
    return Array.from({ length: 48 }, (_, i) => {
      const angleBias = (i / 47) * 2 - 1;
      const spread = (angleBias * 0.55 + (Math.random() - 0.5) * 0.9) * 92;
      const burstXVw = Math.max(-48, Math.min(48, spread));
      // 화면 상단 끝까지 도달 (-80vh ~ -100vh)
      const peak = -(80 + Math.random() * 20);
      const launchY = peak * (0.42 + Math.random() * 0.06);
      const launchX = burstXVw * (0.05 + Math.random() * 0.05);
      const openX = burstXVw * (0.42 + Math.random() * 0.12);
      const openY = peak * (0.78 + Math.random() * 0.06);

      const swayAmp = 2.2 + Math.random() * 4.5;
      const dir = Math.random() > 0.5 ? 1 : -1;
      const width = 5 + Math.floor(Math.random() * 7);
      const fall = 28 + Math.random() * 48;
      const spin = 160 + Math.random() * 380;

      return {
        id: i,
        fallDuration: `${5.0 + Math.random() * 2.4}s`,
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
    }, CONFETTI_TOTAL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [active, playKey]);

  if (!visible || !portalRoot) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
      aria-hidden
      style={{ margin: 0, padding: 0 }}
    >
      {pieces.map((p) => (
        <span
          key={`${burstKey}-${p.id}`}
          className="absolute left-1/2 block will-change-transform"
          style={
            {
              bottom: 0,
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
              animation: [
                `confetti-rise ${RISE_MS}s cubic-bezier(0.08, 0.82, 0.12, 1) 0s forwards`,
                `confetti-fall ${p.fallDuration} linear ${RISE_MS}s forwards`,
              ].join(", "),
            } as React.CSSProperties
          }
        />
      ))}
    </div>,
    portalRoot,
  );
};

export default ReadyConfetti;
