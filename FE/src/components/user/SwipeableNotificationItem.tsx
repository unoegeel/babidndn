import React, { useRef, useState } from "react";
import type { NotificationItem } from "../../types/user";

const SWIPE_THRESHOLD = 72;

interface SwipeableNotificationItemProps {
  notif: NotificationItem;
  onOpen: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}

/** 왼쪽→오른쪽: 읽음 / 오른쪽→왼쪽: 삭제 */
export const SwipeableNotificationItem: React.FC<SwipeableNotificationItemProps> = ({
  notif,
  onOpen,
  onMarkRead,
  onDelete,
}) => {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const axisLockedRef = useRef<"x" | "y" | null>(null);
  const offsetRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const movedRef = useRef(false);

  const reset = () => {
    offsetRef.current = 0;
    setOffsetX(0);
    setSwiping(false);
    draggingRef.current = false;
    axisLockedRef.current = null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    draggingRef.current = true;
    movedRef.current = false;
    axisLockedRef.current = null;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    setSwiping(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (!axisLockedRef.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axisLockedRef.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      if (axisLockedRef.current === "y") {
        reset();
        return;
      }
    }

    if (axisLockedRef.current !== "x") return;
    movedRef.current = true;
    const next = Math.max(-140, Math.min(140, dx));
    offsetRef.current = next;
    setOffsetX(next);
  };

  const finish = () => {
    if (!draggingRef.current) return;
    const dx = offsetRef.current;
    draggingRef.current = false;
    setSwiping(false);

    if (movedRef.current && dx >= SWIPE_THRESHOLD) {
      onMarkRead();
      offsetRef.current = 0;
      setOffsetX(0);
      return;
    }
    if (movedRef.current && dx <= -SWIPE_THRESHOLD) {
      onDelete();
      offsetRef.current = 0;
      setOffsetX(0);
      return;
    }
    offsetRef.current = 0;
    setOffsetX(0);
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    const wasTap = !movedRef.current;
    finish();
    if (wasTap) {
      onOpen();
    }
  };

  const onPointerCancel = () => {
    reset();
  };

  const revealRead = Math.max(0, offsetX);
  const revealDelete = Math.max(0, -offsetX);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* 배경 액션 힌트 */}
      <div className="absolute inset-0 flex">
        <div
          className="flex flex-1 items-center justify-start bg-blue-500 pl-4 text-[10px] font-bold text-white transition-opacity"
          style={{ opacity: revealRead > 8 ? Math.min(1, revealRead / SWIPE_THRESHOLD) : 0 }}
        >
          읽음
        </div>
        <div
          className="flex flex-1 items-center justify-end bg-red-500 pr-4 text-[10px] font-bold text-white transition-opacity"
          style={{ opacity: revealDelete > 8 ? Math.min(1, revealDelete / SWIPE_THRESHOLD) : 0 }}
        >
          삭제
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className={`relative z-[1] touch-pan-y p-3 rounded-xl border text-left flex gap-3 items-start select-none ${
          notif.read
            ? "bg-white border-gray-100 opacity-60"
            : "bg-blue-50/30 border-blue-100"
        } ${swiping ? "" : "transition-transform duration-200"}`}
        style={{ transform: `translateX(${offsetX}px)` }}
      >
        <span
          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
            notif.type === "READY"
              ? notif.read
                ? "bg-green-500"
                : "bg-green-500 animate-ping"
              : notif.type === "PREPARING"
                ? "bg-blue-500"
                : notif.type === "CANCELED"
                  ? "bg-red-500"
                  : "bg-gray-400"
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-bold text-gray-800 truncate">{notif.title}</h4>
            <span className="text-[8px] text-gray-400 font-medium">{notif.createdAt}</span>
          </div>
          <p className="text-[9px] text-gray-500 mt-1 leading-normal">{notif.message}</p>
        </div>
      </div>
    </div>
  );
};

export default SwipeableNotificationItem;
