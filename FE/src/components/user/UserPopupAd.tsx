import { useEffect, useState } from "react";
import { popupAdService, type PopupAd } from "../../services/popupAdService";
import {
  dismissPopupForever,
  dismissPopupThisSession,
  shouldShowPopupAd,
} from "../../utils/popupAdDismiss";

type Props = {
  /** 메뉴 첫 화면일 때만 표시 */
  visible: boolean;
  /** 팝업이 열려 있는지 (다른 안내 UI와 겹침 방지용) */
  onOpenChange?: (open: boolean) => void;
};

/**
 * 유저 메뉴 첫 화면 팝업 광고.
 * - 닫기: 이번 접속(세션)에서만 숨김
 * - 더 이상 보지 않기: 해당 팝업을 영구 숨김 (localStorage)
 */
export default function UserPopupAd({ visible, onOpenChange }: Props) {
  const [ad, setAd] = useState<PopupAd | null>(null);

  useEffect(() => {
    if (!visible) {
      setAd(null);
      onOpenChange?.(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const list = await popupAdService.getActive();
        if (cancelled) return;
        const next = list.find((item) => shouldShowPopupAd(item.id)) ?? null;
        setAd(next);
        onOpenChange?.(next != null);
      } catch (err) {
        console.error("팝업 광고 조회 실패:", err);
        if (!cancelled) {
          setAd(null);
          onOpenChange?.(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // onOpenChange는 보통 setState라 안정적 — 의도적으로 visible만 의존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = (forever: boolean) => {
    if (!ad) return;
    if (forever) {
      dismissPopupForever(ad.id);
    } else {
      dismissPopupThisSession(ad.id);
    }
    setAd(null);
    onOpenChange?.(false);
  };

  if (!visible || !ad) return null;

  return (
    <div className="absolute inset-0 z-[65] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="매장 안내"
        className="flex w-full max-w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in"
      >
        <div className="max-h-[min(70vh,520px)] overflow-hidden bg-black/[0.03]">
          <img
            src={ad.imageUrl}
            alt="팝업 광고"
            className="mx-auto max-h-[min(70vh,520px)] w-full object-contain"
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={() => close(true)}
            className="text-left text-[12px] font-semibold text-gray-500 underline-offset-2 hover:underline cursor-pointer"
          >
            더 이상 보지 않기
          </button>
          <button
            type="button"
            onClick={() => close(false)}
            className="rounded-xl bg-black px-4 py-2 text-[12px] font-bold text-white cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
