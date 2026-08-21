import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReceiptTemplate from "../../components/user/ReceiptTemplate";
import { orderService } from "../../services/user/orderService";
import { userPaymentService } from "../../services/user/paymentService";
import type { ReceiptViewModel } from "../../types/receipt";
import { buildReceiptViewModel } from "../../utils/buildReceiptViewModel";
import { downloadReceiptPdf, downloadReceiptPng } from "../../utils/downloadReceipt";
import type { PaymentResponse } from "../../types/api";
import { ApiError } from "../../api/client";

/**
 * 유저 전자영수증 화면.
 * OrderDetail + Payment → ReceiptViewModel → ReceiptTemplate → PNG/PDF
 */
export const OrderReceiptPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [receipt, setReceipt] = useState<ReceiptViewModel | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState<string | null>(
    orderId ? null : "주문 정보를 찾을 수 없습니다.",
  );
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    const load = async () => {
      await Promise.resolve();
      setLoading(true);
      setError(null);
      try {
        const order = await orderService.getOrder(orderId);

        let payment: PaymentResponse | null = null;
        try {
          payment = await userPaymentService.getByOrderId(orderId);
        } catch (err) {
          // 결제 전·조회 실패 시에도 주문 스냅샷으로 영수증 표시
          if (!(err instanceof ApiError && err.status === 404)) {
            console.warn("결제 정보 조회 실패 — 주문 정보만으로 영수증 표시:", err);
          }
        }

        if (cancelled) return;
        setReceipt(buildReceiptViewModel(order, payment));
      } catch (err) {
        console.error("전자영수증 로드 실패:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "영수증을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const handleDownloadPng = async () => {
    if (!receiptRef.current || !receipt || exporting) return;
    setExporting("png");
    try {
      await downloadReceiptPng(receiptRef.current, {
        pickupNumber: receipt.pickupNumber,
        orderedAt: receipt.orderedAt,
      });
    } catch (err) {
      console.error("Failed to download receipt:", err);
      alert("PNG 다운로드에 실패했습니다.");
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current || !receipt || exporting) return;
    setExporting("pdf");
    try {
      await downloadReceiptPdf(receiptRef.current, {
        pickupNumber: receipt.pickupNumber,
        orderedAt: receipt.orderedAt,
      });
    } catch (err) {
      console.error("Failed to download receipt:", err);
      alert("PDF 다운로드에 실패했습니다.");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50/30 p-6">
        <p className="text-xs font-semibold text-gray-500">전자영수증을 준비하는 중...</p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-gray-50/30 p-6 text-center">
        <p className="text-xs font-bold text-gray-800">{error || "영수증을 찾을 수 없습니다."}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="cursor-pointer rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-100">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ReceiptTemplate ref={receiptRef} receipt={receipt} />
      </div>

      <div
        className="shrink-0 border-t border-gray-200 bg-white px-4 pt-5"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        <p className="mb-4 text-center text-[11px] font-medium leading-relaxed text-gray-500">
          실물 영수증은 매장에 문의해주세요.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!!exporting}
            onClick={() => void handleDownloadPng()}
            className="cursor-pointer rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-800 disabled:opacity-50"
          >
            {exporting === "png" ? "저장 중..." : "PNG 다운로드"}
          </button>
          <button
            type="button"
            disabled={!!exporting}
            onClick={() => void handleDownloadPdf()}
            className="cursor-pointer rounded-xl bg-black py-3 text-xs font-bold text-white disabled:opacity-50"
          >
            {exporting === "pdf" ? "저장 중..." : "PDF 다운로드"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 w-full cursor-pointer py-2 text-center text-[11px] font-semibold text-gray-500"
        >
          주문 현황으로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default OrderReceiptPage;
