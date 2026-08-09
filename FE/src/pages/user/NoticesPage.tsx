import { useEffect, useState } from "react";
import { popupAdService, type PopupAd } from "../../services/popupAdService";

/**
 * 등록된(사용 중) 팝업 광고를 갤러리로 보고, 클릭 시 크게 띄웁니다.
 */
export default function NoticesPage() {
  const [ads, setAds] = useState<PopupAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PopupAd | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const list = await popupAdService.getAll();
        if (!cancelled) setAds(list);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "공지사항을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gray-50/30">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading && (
          <p className="py-16 text-center text-[13px] text-gray-400">불러오는 중…</p>
        )}
        {error && (
          <p className="py-16 text-center text-[13px] text-red-500">{error}</p>
        )}
        {!loading && !error && ads.length === 0 && (
          <p className="py-16 text-center text-[13px] text-gray-400">등록된 공지사항이 없습니다.</p>
        )}

        {!loading && !error && ads.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {ads.map((ad) => (
              <button
                key={ad.id}
                type="button"
                onClick={() => setSelected(ad)}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-sm transition active:scale-[0.98] cursor-pointer"
              >
                <div className="flex aspect-[3/4] items-center justify-center bg-gray-50 p-2">
                  <img
                    src={ad.imageUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="공지사항"
            className="flex w-full max-w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center overflow-hidden bg-black/[0.03]">
              <img
                src={selected.imageUrl}
                alt="공지사항"
                className="max-h-[min(70vh,520px)] w-full object-contain"
              />
            </div>
            <div className="flex justify-end border-t border-gray-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl bg-black px-4 py-2 text-[12px] font-bold text-white cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
