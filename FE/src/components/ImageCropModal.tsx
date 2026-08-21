import { useEffect, useMemo, useRef, useState } from "react";

type AspectOption = { label: string; value: number };

const ASPECT_OPTIONS: AspectOption[] = [
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
];

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

/**
 * 크롭 프레임 기준 contain(최소)~확대 줌.
 * 최소 줌에서는 사진 전체가 프레임 안에 들어가고(최대 폭/높이 맞춤),
 * 드래그·줌은 미리보기 영역 안에서만 동작합니다.
 */
export default function ImageCropModal({ imageSrc, onCancel, onConfirm }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [aspect, setAspect] = useState(1);
  /** 1 = contain(전체 보기), 커질수록 확대 */
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [busy, setBusy] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [resetFor, setResetFor] = useState({ imageSrc, aspect });

  const needsReset = resetFor.imageSrc !== imageSrc || resetFor.aspect !== aspect;
  if (needsReset) {
    const imageChanged = resetFor.imageSrc !== imageSrc;
    setResetFor({ imageSrc, aspect });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (imageChanged) setNatural({ w: 0, h: 0 });
  }

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setViewportSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const frame = useMemo(() => {
    const pad = 24;
    const maxW = Math.max(0, viewportSize.w - pad * 2);
    const maxH = Math.max(0, viewportSize.h - pad * 2);
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    return {
      x: (viewportSize.w - w) / 2,
      y: (viewportSize.h - h) / 2,
      w,
      h,
    };
  }, [aspect, viewportSize]);

  /** 프레임 안에 사진 전체가 들어가도록 맞추는 배율 (contain) */
  const containScale = useMemo(() => {
    if (!natural.w || !frame.w) return 1;
    return Math.min(frame.w / natural.w, frame.h / natural.h);
  }, [natural, frame]);

  /** 프레임을 사진이 가득 채우도록 맞추는 배율 (cover) — 확대 기준점 */
  const coverScale = useMemo(() => {
    if (!natural.w || !frame.w) return 1;
    return Math.max(frame.w / natural.w, frame.h / natural.h);
  }, [natural, frame]);

  // 슬라이더 1 → contain, 최대 → cover 의 약 3배까지 확대
  const maxZoom = useMemo(() => {
    if (!containScale) return 3;
    return Math.max(3, (coverScale / containScale) * 3);
  }, [containScale, coverScale]);

  const displayScale = containScale * zoom;

  const display = useMemo(() => {
    const w = natural.w * displayScale;
    const h = natural.h * displayScale;
    return {
      w,
      h,
      left: frame.x + (frame.w - w) / 2 + offset.x,
      top: frame.y + (frame.h - h) / 2 + offset.y,
    };
  }, [natural, displayScale, frame, offset]);

  /** 사진이 프레임을 완전히 벗어나 버리지 않도록 오프셋 제한 */
  const clampOffset = (x: number, y: number) => {
    const w = natural.w * displayScale;
    const h = natural.h * displayScale;
    const maxX = Math.abs(w - frame.w) / 2;
    const maxY = Math.abs(h - frame.h) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  if (!needsReset) {
    const clampedOffset = clampOffset(offset.x, offset.y);
    if (clampedOffset.x !== offset.x || clampedOffset.y !== offset.y) {
      setOffset(clampedOffset);
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    // 미리보기(뷰포트) 안에서만 드래그
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset(
      clampOffset(
        dragStart.current.ox + (e.clientX - dragStart.current.x),
        dragStart.current.oy + (e.clientY - dragStart.current.y),
      ),
    );
  };

  const onPointerUp = () => setDragging(false);

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img || !natural.w || !display.w) return;

    setBusy(true);
    try {
      // 프레임에 대응하는 원본 좌표 (프레임 밖이면 클램핑 + 흰 여백)
      const rawSx = ((frame.x - display.left) / display.w) * natural.w;
      const rawSy = ((frame.y - display.top) / display.h) * natural.h;
      const rawSw = (frame.w / display.w) * natural.w;
      const rawSh = (frame.h / display.h) * natural.h;

      const sx = Math.max(0, rawSx);
      const sy = Math.max(0, rawSy);
      const sx2 = Math.min(natural.w, rawSx + rawSw);
      const sy2 = Math.min(natural.h, rawSy + rawSh);
      const sw = Math.max(0, sx2 - sx);
      const sh = Math.max(0, sy2 - sy);

      const outW = 800;
      const outH = Math.round(outW / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("캔버스를 사용할 수 없습니다.");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);

      if (sw > 0 && sh > 0) {
        const dx = ((sx - rawSx) / rawSw) * outW;
        const dy = ((sy - rawSy) / rawSh) * outH;
        const dw = (sw / rawSw) * outW;
        const dh = (sh / rawSh) * outH;
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("이미지 변환에 실패했습니다."))),
          "image/jpeg",
          0.9,
        );
      });
      onConfirm(blob);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "이미지 자르기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-[520px] flex-col rounded-[16px] bg-canvas p-5 shadow-xl">
        <h3 className="text-[20px] font-medium text-black">사진 자르기</h3>
        <p className="mt-1 text-[13px] text-black/60">
          미리보기 안에서만 드래그·확대할 수 있습니다. 최소 크기에서는 사진 전체가 영역에 맞춰집니다.
        </p>

        <div className="mt-4 flex gap-2">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setAspect(opt.value)}
              className={`h-9 rounded-[8px] border px-3 text-[13px] font-medium ${
                aspect === opt.value
                  ? "border-black bg-black text-white"
                  : "border-black/40 bg-canvas text-black"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div
          ref={viewportRef}
          className="relative mt-4 h-[320px] touch-none overflow-hidden rounded-[12px] bg-black/90"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="crop"
            draggable={false}
            onLoad={(e) => {
              setNatural({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              });
            }}
            className="pointer-events-none absolute max-w-none select-none"
            style={
              natural.w
                ? {
                    width: display.w,
                    height: display.h,
                    left: display.left,
                    top: display.top,
                  }
                : { opacity: 0 }
            }
          />
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
              style={{
                left: frame.x,
                top: frame.y,
                width: frame.w,
                height: frame.h,
              }}
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-3 text-[14px] text-black">
          <span className="w-14 shrink-0">크기</span>
          <input
            type="range"
            min={1}
            max={Number(maxZoom.toFixed(2))}
            step={0.01}
            value={Math.min(zoom, maxZoom)}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
          <span className="w-16 shrink-0 text-right text-[12px] text-black/50">
            {zoom <= 1.02 ? "전체" : `${zoom.toFixed(1)}×`}
          </span>
        </label>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-12 flex-1 rounded-[10px] border border-black/50 text-[15px] font-medium"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy || !natural.w}
            className="h-12 flex-[1.2] rounded-[10px] bg-black text-[15px] font-medium text-white disabled:opacity-50"
          >
            {busy ? "처리 중…" : "적용"}
          </button>
        </div>
      </div>
    </div>
  );
}
