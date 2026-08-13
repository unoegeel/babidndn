import { useState } from "react";
import type { Payment } from "../../../types/admin";

const CANCEL_REASONS = ["고객 요청", "메뉴 품절", "매장 사정", "중복 결제", "기타"];

export function CancelPopup({
  payment,
  onClose,
  onConfirm,
}: {
  payment: Payment;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/10 p-[20px] md:justify-end md:p-[48px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-[25px] border border-black/50 bg-canvas p-[24px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[26px] font-medium tracking-wide text-black">
          정말 취소하시겠습니까?
        </h2>

        <p className="mt-[24px] text-[15px] font-medium text-black">
          취소할 주문
        </p>
        <p className="mt-[8px] text-[22px] font-medium text-black">
          주문번호 {payment.orderNumber} ({payment.amount.toLocaleString()}원)
        </p>

        <p className="mt-[24px] text-[15px] font-medium text-black">
          취소 사유 선택 <span style={{ color: "#ef4444" }}>(필수)</span>
        </p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-[10px] h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[15px] outline-none focus:border-black"
        >
          <option value="">취소 사유를 선택하세요.</option>
          {CANCEL_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <div
          className="mt-[20px] flex h-[48px] items-center gap-[10px] rounded-[10px] px-[16px]"
          style={{
            backgroundColor: "rgba(217,119,6,0.5)",
            border: "1px solid rgba(239,68,68,0.75)",
          }}
        >
          <span style={{ color: "#ef4444" }}>⚠</span>
          <span className="text-[15px]" style={{ color: "#ef4444" }}>
            취소 완료 후 복구할 수 없습니다.
          </span>
        </div>

        <div className="mt-[20px] flex gap-[16px]">
          <button
            onClick={onClose}
            className="h-[48px] w-[130px] rounded-[10px] border border-black/50 bg-canvas text-[15px] font-medium text-black"
          >
            닫기
          </button>
          <button
            onClick={async () => {
              if (submitting) return;
              setSubmitting(true);
              await onConfirm(reason);
              setSubmitting(false);
            }}
            disabled={!reason || submitting}
            className="h-[48px] flex-1 rounded-[10px] text-[15px] font-medium text-canvas disabled:opacity-40"
            style={{ backgroundColor: "#ef4444" }}
          >
            {submitting ? "취소 처리 중..." : "취소 처리"}
          </button>
        </div>
      </div>
    </div>
  );
}
