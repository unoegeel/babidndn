import { useRef, useState } from "react";
import { ReceiptTemplate } from "../../user/ReceiptTemplate";
import type { ReceiptViewModel } from "../../../types/receipt";
import { notifyFileDownloadStarted } from "../../../utils/downloadFeedback";
import {
  downloadReceiptPdf,
  downloadReceiptPng,
} from "../../../utils/downloadReceipt";
import { handlePrintCustomerReceipt } from "../../../utils/printCustomerReceipt";

export function ReceiptPopup({
  receipt,
  onClose,
}: {
  receipt: ReceiptViewModel;
  onClose: () => void;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<"png" | "pdf" | null>(null);

  const runDownload = async (kind: "png" | "pdf") => {
    if (!receiptRef.current || downloading) return;
    setDownloading(kind);
    try {
      const meta = {
        pickupNumber: receipt.pickupNumber,
        orderedAt: receipt.orderedAt,
      };
      const result =
        kind === "png"
          ? await downloadReceiptPng(receiptRef.current, meta)
          : await downloadReceiptPdf(receiptRef.current, meta);
      notifyFileDownloadStarted(result);
    } catch (err) {
      console.error("영수증 다운로드 실패:", err);
      alert("영수증 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/10 p-[20px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(920px,calc(100vh-40px))] w-full max-w-[400px] flex-col overflow-hidden rounded-[25px] border border-black/50 bg-canvas shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/15 px-[20px] py-[16px]">
          <h2 className="text-[18px] font-medium text-black">전자영수증</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] rounded-[10px] border border-black/40 bg-canvas px-[12px] text-[13px] font-medium text-black"
          >
            닫기
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-panel/40 px-[16px] py-[16px]">
          <div className="mx-auto max-w-[320px] overflow-hidden rounded-[12px] border border-black/15 bg-white shadow-sm">
            <ReceiptTemplate ref={receiptRef} receipt={receipt} />
          </div>
        </div>

        <div className="shrink-0 space-y-[10px] border-t border-black/15 bg-canvas px-[16px] py-[16px]">
          <button
            type="button"
            onClick={() => handlePrintCustomerReceipt(receipt)}
            className="h-[48px] w-full rounded-[10px] bg-black text-[15px] font-medium text-canvas"
          >
            영수증 출력
          </button>
          <div className="grid grid-cols-2 gap-[10px]">
            <button
              type="button"
              disabled={!!downloading}
              onClick={() => void runDownload("png")}
              className="h-[44px] rounded-[10px] border border-black/50 bg-canvas text-[14px] font-medium text-black disabled:opacity-40"
            >
              {downloading === "png" ? "저장 중..." : "PNG 저장"}
            </button>
            <button
              type="button"
              disabled={!!downloading}
              onClick={() => void runDownload("pdf")}
              className="h-[44px] rounded-[10px] border border-black/50 bg-canvas text-[14px] font-medium text-black disabled:opacity-40"
            >
              {downloading === "pdf" ? "저장 중..." : "PDF 저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
