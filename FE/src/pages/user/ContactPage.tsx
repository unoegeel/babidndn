import { useState, type FormEvent } from "react";
import { contactService } from "../../services/contactService";

const MAX_LENGTH = 2000;

export default function ContactPage() {
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
      await contactService.send(trimmed);
      setContent("");
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "문의 전송에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-gray-50/30 px-4 py-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900">서비스 문의</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500">
          이용 중 불편한 점이나 개선이 필요한 내용을 남겨 주세요.
          <br />
          접수된 문의는 서비스 운영 메일로 전달됩니다.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900">문의가 전송되었습니다.</p>
          <p className="mt-2 text-[12px] leading-relaxed text-gray-500">
            소중한 의견 감사합니다. 확인 후 개선에 반영할게요.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-4 w-full rounded-xl bg-black py-3 text-xs font-bold text-white cursor-pointer"
          >
            다른 문의 남기기
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <label htmlFor="contact-content" className="sr-only">
            문의 내용
          </label>
          <textarea
            id="contact-content"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
            rows={8}
            placeholder="예) 결제 후 주문 현황이 보이지 않아요."
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
              {submitting ? "전송 중…" : "보내기"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
