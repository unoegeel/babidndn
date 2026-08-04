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
 * 줌·드래그·비율 선택으로 이미지를 자르는 모달 (외부 라이브러리 없음).
 * 결과는 JPEG Blob 으로 반환합니다.
 */
export default function ImageCropModal({ imageSrc, onCancel, onConfirm }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [aspect, setAspect] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [busy, setBusy] = useState(false);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [imageSrc, aspect]);

  useEffect(() => {
    setNatural({ w: 0, h: 0 });
  }, [imageSrc]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setViewportSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseScale = useMemo(() => {
    if (!natural.w || !viewportSize.w) return 1;
    return Math.min(viewportSize.w / natural.w, viewportSize.h / natural.h);
  }, [natural, viewportSize]);

  const display = useMemo(() => {
    const w = natural.w * baseScale * zoom;
    const h = natural.h * baseScale * zoom;
    return {
      w,
      h,
      left: (viewportSize.w - w) / 2 + offset.x,
      top: (viewportSize.h - h) / 2 + offset.y,
    };
  }, [natural, baseScale, zoom, offset, viewportSize]);

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

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };

  const onPointerUp = () => setDragging(false);

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img || !natural.w || !display.w) return;

    setBusy(true);
    try {
      const sx = ((frame.x - display.left) / display.w) * natural.w;
      const sy = ((frame.y - display.top) / display.h) * natural.h;
      const sw = (frame.w / display.w) * natural.w;
      const sh = (frame.h / display.h) * natural.h;

      const outW = 800;
      const outH = Math.round(outW / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("캔버스를 사용할 수 없습니다.");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

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
        <p className="mt-1 text-[13px] text-black/60">드래그로 위치를, 슬라이더로 확대를 조절하세요.</p>

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
          <span className="w-10 shrink-0">확대</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
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
