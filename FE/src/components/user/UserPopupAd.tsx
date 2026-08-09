import { useEffect, useRef, useState, type TouchEvent } from "react";
import { popupAdService, type PopupAd } from "../../services/popupAdService";
import {
  closePopupThisSession,
  dismissPopupToday,
  filterShowablePopupAds,
} from "../../utils/popupAdDismiss";

type Props = {
  /** 메뉴 첫 화면일 때만 표시 */
  visible: boolean;
  /** 팝업이 열려 있는지 (다른 안내 UI와 겹침 방지용) */
  onOpenChange?: (open: boolean) => void;
};

const SLIDE_MS = 4000;
const SWIPE_THRESHOLD_PX = 48;

/**
 * 유저 메뉴 첫 화면 팝업 광고.
 * - 등록 오래된 순, 자동은 항상 다음 방향(오른쪽에서 들어옴)으로만 순환
 * - 좌우 스와이프로 이전/다음
 */
export default function UserPopupAd({ visible, onOpenChange }: Props) {
  const [ads, setAds] = useState<PopupAd[]>([]);
  /** 무한 트랙: [last, ...ads, first], 실제 시작 위치=1 */
  const [trackIndex, setTrackIndex] = useState(1);
  const [animate, setAnimate] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [paused, setPaused] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lockAxis = useRef<"x" | "y" | null>(null);
  const jumpPending = useRef(false);

  useEffect(() => {
    if (!visible) {
      setAds([]);
      setTrackIndex(1);
      onOpenChange?.(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const list = await popupAdService.getActive();
        if (cancelled) return;
        const sorted = [...list].sort((a, b) => {
          const ca = a.createdAt ?? "";
          const cb = b.createdAt ?? "";
          if (ca && cb && ca !== cb) return ca.localeCompare(cb);
          return a.id - b.id;
        });
        const showable = filterShowablePopupAds(sorted);
        setAds(showable);
        setTrackIndex(1);
        setAnimate(true);
        onOpenChange?.(showable.length > 0);
      } catch (err) {
        console.error("팝업 광고 조회 실패:", err);
        if (!cancelled) {
          setAds([]);
          onOpenChange?.(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const n = ads.length;
  const trackSlides =
    n <= 1 ? ads : ([ads[n - 1], ...ads, ads[0]] as PopupAd[]);

  const realIndex = (() => {
    if (n <= 1) return 0;
    if (trackIndex <= 0) return n - 1;
    if (trackIndex >= n + 1) return 0;
    return trackIndex - 1;
  })();

  useEffect(() => {
    if (n <= 1 || paused || dragX !== 0) return;
    const timer = window.setInterval(() => {
      setAnimate(true);
      setTrackIndex((prev) => prev + 1);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [n, paused, dragX, ads]);

  const snapTrackIfNeeded = (idx: number) => {
    if (n <= 1) return;
    if (idx === n + 1) {
      jumpPending.current = true;
      setAnimate(false);
      setTrackIndex(1);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimate(true);
          jumpPending.current = false;
        });
      });
    } else if (idx === 0) {
      jumpPending.current = true;
      setAnimate(false);
      setTrackIndex(n);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimate(true);
          jumpPending.current = false;
        });
      });
    }
  };

  const goNext = () => {
    if (n <= 1 || jumpPending.current) return;
    setAnimate(true);
    setTrackIndex((prev) => prev + 1);
  };

  const goPrev = () => {
    if (n <= 1 || jumpPending.current) return;
    setAnimate(true);
    setTrackIndex((prev) => prev - 1);
  };

  const dismissTodayCurrent = () => {
    const current = ads[realIndex];
    if (!current) return;
    dismissPopupToday(current.id);
    const next = ads.filter((a) => a.id !== current.id);
    if (next.length === 0) {
      setAds([]);
      onOpenChange?.(false);
      return;
    }
    setAds(next);
    setTrackIndex(1);
    setAnimate(false);
    requestAnimationFrame(() => setAnimate(true));
  };

  const closeSession = () => {
    closePopupThisSession();
    setAds([]);
    onOpenChange?.(false);
  };

  const onTouchStart = (e: TouchEvent) => {
    if (n <= 1) return;
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    lockAxis.current = null;
    setPaused(true);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null || n <= 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;

    if (lockAxis.current == null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      lockAxis.current = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }
    if (lockAxis.current !== "x") return;
    setDragX(dx);
  };

  const onTouchEnd = () => {
    const dx = dragX;
    const axis = lockAxis.current;
    touchStartX.current = null;
    touchStartY.current = null;
    lockAxis.current = null;
    setDragX(0);
    setPaused(false);

    if (axis !== "x" || n <= 1) return;
    if (dx <= -SWIPE_THRESHOLD_PX) goNext();
    else if (dx >= SWIPE_THRESHOLD_PX) goPrev();
  };

  if (!visible || ads.length === 0) return null;

  // track width = viewport; translateX % 는 track(뷰포트) 너비 기준 → 한 칸 = 100%
  const transform = `translateX(calc(-${(n <= 1 ? 0 : trackIndex) * 100}% + ${dragX}px))`;

  return (
    <div className="absolute inset-0 z-[65] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="매장 안내"
        className="flex w-full max-w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in"
      >
        <div
          className="relative h-[min(70vh,520px)] w-full overflow-hidden bg-black/[0.03] touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          <div
            className={`flex h-full w-full ${
              animate && dragX === 0 ? "transition-transform duration-500 ease-out" : ""
            }`}
            style={{ transform }}
            onTransitionEnd={() => {
              if (dragX !== 0) return;
              snapTrackIfNeeded(trackIndex);
            }}
          >
            {trackSlides.map((ad, i) => (
              <div
                key={`${ad.id}-${i}`}
                className="flex h-full w-full shrink-0 grow-0 basis-full items-center justify-center"
              >
                <img
                  src={ad.imageUrl}
                  alt="팝업 광고"
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                />
              </div>
            ))}
          </div>
          {n > 1 && (
            <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {ads.map((ad, i) => (
                <span
                  key={ad.id}
                  className={`h-1.5 rounded-full transition-all ${
                    i === realIndex ? "w-4 bg-black/50" : "w-1.5 bg-black/25"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={dismissTodayCurrent}
            className="text-left text-[12px] font-semibold text-gray-500 underline-offset-2 hover:underline cursor-pointer"
          >
            오늘 하루 보지 않기
          </button>
          <button
            type="button"
            onClick={closeSession}
            className="rounded-xl bg-black px-4 py-2 text-[12px] font-bold text-white cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
