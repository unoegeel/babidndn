import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { CancelPopup } from "../../components/owner/payment/CancelPopup";
import { ExportPopup } from "../../components/owner/payment/ExportPopup";
import { PaymentRow } from "../../components/owner/payment/PaymentRow";
import { useAdminData } from "../../store/AdminDataContext";
import type { Payment } from "../../types/admin";
import {
  buildPaymentExportText,
  downloadPaymentExport,
  formatPaymentMenusForExport,
  rangeFromDateInputs,
  type PaymentExportFormat,
} from "../../utils/paymentExport";
import { seoulDateKey, seoulDayBoundsMs } from "../../utils/serverDate";

type PeriodFilter = "all" | "today" | "last3" | "custom";

export default function PaymentHistoryPage() {
  const { payments, refundPayment, refreshPayments, getOrderDetail } = useAdminData();
  const [keyword, setKeyword] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [customStart, setCustomStart] = useState(() => seoulDateKey());
  const [customEnd, setCustomEnd] = useState(() => seoulDateKey());
  const [target, setTarget] = useState<Payment | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  const loadPayments = () => {
    refreshPayments()
      .catch((err) => console.error("결제 내역 조회 실패:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const k = keyword.trim();
    const todayBounds = seoulDayBoundsMs(seoulDateKey());
    const todayStart = todayBounds?.startMs ?? 0;
    const threeDaysAgo = todayStart - 2 * 24 * 60 * 60 * 1000; // 오늘 포함 최근 3일
    const customRange =
      period === "custom" && customStart && customEnd
        ? rangeFromDateInputs(customStart, customEnd)
        : null;

    return payments.filter((p) => {
      if (k && String(p.orderNumber) !== k) {
        return false;
      }
      if (period === "today" && p.paidAtMs < todayStart) {
        return false;
      }
      if (period === "last3" && p.paidAtMs < threeDaysAgo) {
        return false;
      }
      if (period === "custom") {
        if (!customRange || customRange.endMs < customRange.startMs) return false;
        if (p.paidAtMs < customRange.startMs || p.paidAtMs > customRange.endMs) {
          return false;
        }
      }
      return true;
    });
  }, [payments, keyword, period, customStart, customEnd]);

  const toggleExpand = (payment: Payment) => {
    setExpandedId((prev) => (prev === payment.id ? null : payment.id));
  };

  const handleExport = (startLocal: string, endLocal: string, format: PaymentExportFormat) => {
    const range = rangeFromDateInputs(startLocal, endLocal);
    if (!range) {
      alert("내려받을 기간을 올바르게 설정해 주세요.");
      return;
    }

    const rows = payments
      .filter((p) => p.paidAtMs >= range.startMs && p.paidAtMs <= range.endMs)
      .sort((a, b) => b.paidAtMs - a.paidAtMs)
      .map((payment) => {
        const detail =
          payment.orderId !== undefined ? getOrderDetail(payment.orderId) : undefined;
        return {
          payment,
          menus: formatPaymentMenusForExport(detail, payment.summary),
        };
      });

    if (rows.length === 0) {
      alert("해당 기간에 결제 내역이 없습니다.");
      return;
    }

    const content = buildPaymentExportText(rows);
    const stem = `바비오더_결제내역_${startLocal.slice(0, 10)}_${endLocal.slice(0, 10)}`;
    downloadPaymentExport(content, format, stem);
    setExportOpen(false);
  };

  return (
    <AdminShell>
      <div className="flex h-full min-h-0 flex-col p-[16px] md:p-[24px] short:p-[12px]">
        <div className="mb-[16px] flex shrink-0 items-center justify-between gap-[12px] short:mb-[10px]">
          <h1 className="text-[22px] font-bold text-black short:text-[18px]">결제 내역</h1>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="h-[40px] shrink-0 rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[14px] font-medium text-black short:h-[36px] short:text-[13px]"
          >
            내려받기
          </button>
        </div>

        {/* 필터 */}
        <div className="mb-[24px] flex flex-wrap items-center gap-[12px] md:gap-[16px]">
          <div className="relative">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="주문번호 검색"
              inputMode="numeric"
              className="h-[48px] w-[217px] rounded-[10px] border border-black/50 bg-canvas pl-[16px] pr-[44px] text-[15px] outline-none placeholder:text-black/50 focus:border-black"
            />
            <svg
              className="absolute right-[14px] top-1/2 -translate-y-1/2 text-black"
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </div>
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              className="h-[48px] w-[160px] appearance-none rounded-[10px] border border-black/50 bg-canvas pl-[16px] pr-[40px] text-[15px] outline-none focus:border-black"
            >
              <option value="all">전체 기간</option>
              <option value="today">오늘</option>
              <option value="last3">최근 3일</option>
              <option value="custom">기간 선택</option>
            </select>
            <svg
              className="pointer-events-none absolute right-[14px] top-1/2 -translate-y-1/2 text-black"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-[8px]">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-[48px] rounded-[10px] border border-black/50 bg-canvas px-[12px] text-[15px] outline-none focus:border-black"
              />
              <span className="text-[14px] text-black/50">~</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-[48px] rounded-[10px] border border-black/50 bg-canvas px-[12px] text-[15px] outline-none focus:border-black"
              />
            </div>
          )}
        </div>

        {/* 표 */}
        <div className="min-h-0 flex-1 overflow-auto rounded-[25px] border border-black/50 bg-canvas">
          <table className="w-full min-w-[720px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-panel text-[16px] font-medium text-black">
                <Th>결제 시간</Th>
                <Th>주문번호</Th>
                <Th>결제 수단</Th>
                <Th>결제 금액</Th>
                <Th>상태</Th>
                <Th>결제 내역</Th>
                <Th>작업</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const expanded = expandedId === p.id;
                const detail =
                  p.orderId !== undefined ? getOrderDetail(p.orderId) : undefined;
                return (
                  <PaymentRow
                    key={p.id}
                    payment={p}
                    expanded={expanded}
                    detail={detail}
                    onToggle={() => toggleExpand(p)}
                    onCancel={() => setTarget(p)}
                  />
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-[48px] text-center text-black/50">
                    {loading ? "결제 내역을 불러오는 중..." : "검색 결과가 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {exportOpen && (
        <ExportPopup
          onClose={() => setExportOpen(false)}
          onConfirm={handleExport}
        />
      )}

      {target && (
        <CancelPopup
          payment={target}
          onClose={() => setTarget(null)}
          onConfirm={async (reason) => {
            const ok = await refundPayment(target.id, reason);
            if (!ok) {
              alert("결제 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.");
            }
            setTarget(null);
          }}
        />
      )}
    </AdminShell>
  );
}

function Th({ children }: { children: string }) {
  return <th className="px-[16px] py-[20px] text-center">{children}</th>;
}
