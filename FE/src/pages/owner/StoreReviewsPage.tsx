import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../../components/AdminShell";
import { adminReviewService, type StoreReview } from "../../services/reviewService";

function formatReviewDate(iso: string): string {
  if (!iso) return "";
  return iso.replace("T", " ").slice(0, 16);
}

/** 매장 관리 > 고객 리뷰 전용 페이지 */
export default function StoreReviewsPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const list = await adminReviewService.getAll();
      setReviews(list);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "리뷰를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await loadReviews();
    })();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("이 리뷰를 삭제할까요?")) return;
    try {
      await adminReviewService.delete(id);
      await loadReviews();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "리뷰 삭제에 실패했습니다.");
    }
  };

  return (
    <AdminShell>
      <div className="p-[20px] md:p-[32px]">
        <div className="mb-[20px] flex flex-wrap items-center gap-[12px]">
          <button
            type="button"
            onClick={() => navigate("/admin/store")}
            className="rounded-[10px] border border-black/30 px-[14px] py-[8px] text-[13px] font-medium text-black"
          >
            ← 매장 관리
          </button>
          <h1 className="text-[24px] font-bold text-black">리뷰</h1>
        </div>

        {loading && <p className="text-[14px] text-black/50">불러오는 중…</p>}
        {error && <p className="text-[14px] text-red-600">{error}</p>}
        {!loading && !error && reviews.length === 0 && (
          <p className="text-[14px] text-black/50">아직 등록된 리뷰가 없습니다.</p>
        )}

        <ul className="mt-[8px] max-w-[720px] space-y-[12px]">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-[20px] border border-black/40 bg-canvas p-[20px]"
            >
              <div className="flex items-start justify-between gap-[12px]">
                <p className="text-[13px] text-black/50">
                  {formatReviewDate(review.createdAt)}
                </p>
                <button
                  type="button"
                  onClick={() => void handleDelete(review.id)}
                  className="shrink-0 rounded-[8px] border border-red-300 px-[10px] py-[4px] text-[12px] font-medium text-red-600"
                >
                  삭제
                </button>
              </div>
              <p className="mt-[10px] whitespace-pre-wrap text-[15px] leading-relaxed text-black">
                {review.content}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </AdminShell>
  );
}
