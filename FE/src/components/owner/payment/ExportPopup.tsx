import { useState } from "react";
import {
  defaultExportRangeLocal,
  type PaymentExportFormat,
} from "../../../utils/paymentExport";

export function ExportPopup({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (startLocal: string, endLocal: string, format: PaymentExportFormat) => void;
}) {
  const defaults = defaultExportRangeLocal();
  const [startAt, setStartAt] = useState(defaults.start);
  const [endAt, setEndAt] = useState(defaults.end);
  const [format, setFormat] = useState<PaymentExportFormat>("csv");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/10 p-[20px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-[25px] border border-black/50 bg-canvas p-[24px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[22px] font-medium text-black">
          결제 내역 내려받기
        </h2>
        <p className="mt-[8px] text-[14px] text-black/55">
          선택한 기간의 결제 내역을 CSV 또는 TXT로 저장합니다.
        </p>

        <div className="mt-[20px] flex gap-[10px]">
          <label className="flex min-w-0 flex-1 flex-col gap-[6px] text-[13px] text-black/70">
            시작
            <input
              type="date"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="h-[40px] w-full rounded-[10px] border border-black/40 bg-white px-[12px] text-[14px] text-black outline-none focus:border-black"
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-[6px] text-[13px] text-black/70">
            종료
            <input
              type="date"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="h-[40px] w-full rounded-[10px] border border-black/40 bg-white px-[12px] text-[14px] text-black outline-none focus:border-black"
            />
          </label>
        </div>

        <p className="mt-[16px] text-[13px] font-medium text-black/70">파일 형식</p>
        <div className="mt-[8px] flex gap-[10px]">
          <button
            type="button"
            onClick={() => setFormat("csv")}
            className={`h-[40px] flex-1 rounded-[10px] border text-[14px] font-medium ${
              format === "csv"
                ? "border-black bg-black text-canvas"
                : "border-black/40 bg-canvas text-black"
            }`}
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => setFormat("txt")}
            className={`h-[40px] flex-1 rounded-[10px] border text-[14px] font-medium ${
              format === "txt"
                ? "border-black bg-black text-canvas"
                : "border-black/40 bg-canvas text-black"
            }`}
          >
            TXT
          </button>
        </div>

        <div className="mt-[24px] flex gap-[12px]">
          <button
            type="button"
            onClick={onClose}
            className="h-[48px] w-[120px] rounded-[10px] border border-black/50 bg-canvas text-[15px] font-medium text-black"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm(startAt, endAt, format)}
            className="h-[48px] flex-1 rounded-[10px] bg-black text-[15px] font-medium text-canvas"
          >
            내려받기
          </button>
        </div>
      </div>
    </div>
  );
}
