import { useEffect, useState } from "react";
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

/**
 * 유저 메뉴 첫 화면 팝업 광고 (다중 시 자동 슬라이드).
 * - 닫기: 이번 접속에서 팝업 전체 숨김
 * - 오늘 하루 보지 않기: 해당 광고만 서울 자정까지 숨김
 */
export default function UserPopupAd({ visible, onOpenChange }: Props) {
  const [ads, setAds] = useState<PopupAd[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setAds([]);
      setIndex(0);
      onOpenChange?.(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const list = await popupAdService.getActive();
        if (cancelled) return;
        const showable = filterShowablePopupAds(list);
        setAds(showable);
        setIndex(0);
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

  // 자동 슬라이드
  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % ads.length);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [ads]);

  const dismissTodayCurrent = () => {
    const current = ads[index];
    if (!current) return;
    dismissPopupToday(current.id);
    const next = ads.filter((a) => a.id !== current.id);
    if (next.length === 0) {
      setAds([]);
      onOpenChange?.(false);
      return;
    }
    setAds(next);
    setIndex((prev) => Math.min(prev, next.length - 1));
  };

  const closeSession = () => {
    closePopupThisSession();
    setAds([]);
    onOpenChange?.(false);
  };

  if (!visible || ads.length === 0) return null;

  const safeIndex = ((index % ads.length) + ads.length) % ads.length;

  return (
    <div className="absolute inset-0 z-[65] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="매장 안내"
        className="flex w-full max-w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in"
      >
        <div className="relative max-h-[min(70vh,520px)] overflow-hidden bg-black/[0.03]">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${safeIndex * 100}%)` }}
          >
            {ads.map((ad) => (
              <div key={ad.id} className="w-full shrink-0">
                <img
                  src={ad.imageUrl}
                  alt="팝업 광고"
                  className="mx-auto max-h-[min(70vh,520px)] w-full object-contain"
                  draggable={false}
                />
              </div>
            ))}
          </div>
          {ads.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {ads.map((ad, i) => (
                <button
                  key={ad.id}
                  type="button"
                  aria-label={`${i + 1}번째 광고`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === safeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
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
