import { useState, type FormEvent } from "react";
import { reviewService } from "../../services/reviewService";

const MAX_LENGTH = 1000;

export default function ReviewPage() {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const remaining = MAX_LENGTH - content.length;
  const canSubmit = content.trim().length > 0 && !submitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await reviewService.create(trimmed);
      setContent("");
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "의견 전달에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-gray-50/30 px-4 py-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900">사장님께 의견 전하기</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500">
          주문·메뉴·매장에 대한 의견을 자유롭게 남겨 주세요.
          <br />
          작성하신 내용은 사장님만 확인할 수 있습니다.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900">의견이 전달되었습니다.</p>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-500">
            소중한 의견 감사합니다. 더 나은 매장 운영에 반영할게요.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-4 w-full rounded-xl bg-black py-3 text-xs font-bold text-white cursor-pointer"
          >
            다른 의견 남기기
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <label htmlFor="review-content" className="sr-only">
            의견 내용
          </label>
          <textarea
            id="review-content"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
            rows={8}
            placeholder="예) 음식이 맛있었어요. 포장도 깔끔합니다!"
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-3 text-base leading-relaxed text-gray-800 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-0"
            disabled={submitting}
          />
          <div className="mt-2 flex items-center justify-between">
            <span
              className={`text-[11px] ${remaining < 50 ? "text-amber-600" : "text-gray-400"}`}
            >
              {remaining.toLocaleString()}자 남음
            </span>
            <button
              type="submit"
              disabled={!canSubmit}
              className="cursor-pointer rounded-xl border border-[#D8B47E] bg-[#D8B47E] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#C59B62] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "전송 중…" : "의견 보내기"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
