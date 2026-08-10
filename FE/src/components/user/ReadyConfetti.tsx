import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

const APP_FRAME_ID = "user-app-frame";

/** 앱 프레임(user-app-frame)의 viewport 기준 경계 — confetti clip·발사점 */
interface ClipBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

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
  playKey?: string;
  onDone?: () => void;
}

let lastModulePlayKey: string | null = null;

/**
 * user-app-frame의 getBoundingClientRect()로 clip 영역 계산.
 * fixed 포탈은 viewport 좌표를 쓰므로 rect.left/top/width/height 그대로 사용.
 */
function readClipBounds(): ClipBounds {
  const frame = document.getElementById(APP_FRAME_ID);
  if (frame) {
    const rect = frame.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    }
  }

  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const width = vv?.width ?? window.innerWidth;
  const offsetTop = vv?.offsetTop ?? 0;
  const offsetLeft = vv?.offsetLeft ?? 0;

  return {
    left: offsetLeft,
    top: offsetTop,
    width,
    height,
  };
}

/** 다색 confetti — 앱 프레임 하단 중앙 고정 앵커 → transform은 자식만 */
export const ReadyConfetti: React.FC<ReadyConfettiProps> = ({ active, playKey, onDone }) => {
  const [visible, setVisible] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [clipBounds, setClipBounds] = useState<ClipBounds>(() => readClipBounds());
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const syncClipBounds = () => {
    setClipBounds(readClipBounds());
  };

  useLayoutEffect(() => {
    if (!visible) return;
    syncClipBounds();
  }, [visible, burstKey]);

  useEffect(() => {
    if (!visible) return;
    const onViewportChange = () => syncClipBounds();
    window.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
    };
  }, [visible, burstKey]);

  const pieces = useMemo<Piece[]>(() => {
    return Array.from({ length: 48 }, (_, i) => {
      const angleBias = (i / 47) * 2 - 1;
      const spread = (angleBias * 0.55 + (Math.random() - 0.5) * 0.9) * 92;
      const burstXVw = Math.max(-48, Math.min(48, spread));
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

    syncClipBounds();
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

  const clipStyle: React.CSSProperties = {
    position: "fixed",
    left: clipBounds.left,
    top: clipBounds.top,
    width: clipBounds.width,
    height: clipBounds.height,
    margin: 0,
    padding: 0,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 9999,
  };

  return createPortal(
    <div aria-hidden style={clipStyle}>
      {pieces.map((p) => (
        /* 앵커: 프레임 하단 중앙 고정 — transform 애니메이션을 적용하지 않음 */
        <div
          key={`${burstKey}-${p.id}`}
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            width: p.width,
            height: p.height,
            marginLeft: -p.width / 2,
          }}
        >
          {/* motion: transform만 담당 — rise + fall (낙하 키프레임 유지) */}
          <div
            className="will-change-transform"
            style={
              {
                width: "100%",
                height: "100%",
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
        </div>
      ))}
    </div>,
    portalRoot,
  );
};

export default ReadyConfetti;
