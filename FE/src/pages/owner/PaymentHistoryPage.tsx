import { useEffect, useMemo, useState, type MouseEvent } from "react";
import AdminShell from "../../components/AdminShell";
import { useAdminData } from "../../store/AdminDataContext";
import type { Payment } from "../../types/admin";
import type { OrderDetailResponse } from "../../types/api";
import { formatOrderItemOptionLabels } from "../../utils/orderItemOptions";

const CANCEL_REASONS = ["고객 요청", "메뉴 품절", "매장 사정", "중복 결제", "기타"];

export default function PaymentHistoryPage() {
  const { payments, refundPayment, refreshPayments, getOrderDetail } = useAdminData();
  const [keyword, setKeyword] = useState("");
  const [target, setTarget] = useState<Payment | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    return k ? payments.filter((p) => String(p.orderNumber).includes(k)) : payments;
  }, [payments, keyword]);

  const toggleExpand = (payment: Payment) => {
    setExpandedId((prev) => (prev === payment.id ? null : payment.id));
  };

  return (
    <AdminShell>
      <div className="flex h-full min-h-0 flex-col p-[16px] md:p-[24px] short:p-[12px]">
        <h1 className="mb-[16px] shrink-0 text-[22px] font-bold text-black short:mb-[10px] short:text-[18px]">
          결제 내역
        </h1>

        {/* 필터 */}
        <div className="mb-[24px] flex flex-wrap items-center gap-[12px] md:gap-[16px]">
          <div className="relative">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="주문번호 검색"
              className="h-[48px] w-[217px] rounded-[10px] border border-black/50 bg-canvas pl-[16px] pr-[44px] text-[15px] tracking-[1px] outline-none placeholder:text-black/50 focus:border-black"
            />
            <svg
              className="absolute right-[14px] top-1/2 -translate-y-1/2 text-black"
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </div>
          <select className="h-[48px] w-[160px] rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[15px] tracking-[1px] outline-none focus:border-black">
            <option>전체 기간</option>
            <option>오늘</option>
            <option>최근 7일</option>
          </select>
          <button className="flex size-[48px] items-center justify-center rounded-[10px] border border-black/50 bg-canvas text-black" aria-label="달력">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>
          </button>
          <button
            onClick={loadPayments}
            className="flex size-[48px] items-center justify-center rounded-[10px] border border-black/50 bg-canvas text-black"
            aria-label="새로고침"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" />
            </svg>
          </button>
        </div>

        {/* 표 */}
        <div className="min-h-0 flex-1 overflow-auto rounded-[25px] border border-black/50 bg-canvas">
          <table className="w-full min-w-[720px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-panel text-[16px] font-medium tracking-[1px] text-black">
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

function PaymentRow({
  payment,
  expanded,
  detail,
  onToggle,
  onCancel,
}: {
  payment: Payment;
  expanded: boolean;
  detail: OrderDetailResponse | undefined;
  onToggle: () => void;
  onCancel: () => void;
}) {
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <>
      <tr
        className="cursor-pointer border-b border-black/15 hover:bg-black/[0.03]"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <Td>{payment.paidAt}</Td>
        <Td>{payment.orderNumber}</Td>
        <Td>{payment.method}</Td>
        <Td>{payment.amount.toLocaleString()}원</Td>
        <Td>
          <span
            className="font-medium tracking-[1px]"
            style={{
              color:
                payment.status === "결제완료"
                  ? "#22c55e"
                  : payment.status === "취소됨"
                    ? "#ef4444"
                    : "rgba(0,0,0,0.5)",
            }}
          >
            {payment.status}
          </span>
        </Td>
        <Td>
          <span className="inline-flex items-center gap-[6px]">
            {payment.summary}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`shrink-0 text-black/40 transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </Td>
        <Td>
          {payment.status === "결제완료" ? (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onCancel();
              }}
              className="h-[40px] w-[110px] rounded-[10px] border border-danger bg-canvas text-[15px] font-medium tracking-[1px] text-danger"
            >
              결제 취소
            </button>
          ) : (
            <span className="text-black/50">-</span>
          )}
        </Td>
      </tr>
      {expanded && (
        <tr className="border-b border-black/15 bg-panel/60">
          <td colSpan={7} className="px-[24px] py-[18px] text-left">
            <PaymentDetailPanel payment={payment} detail={detail} />
          </td>
        </tr>
      )}
    </>
  );
}

function PaymentDetailPanel({
  payment,
  detail,
}: {
  payment: Payment;
  detail: OrderDetailResponse | undefined;
}) {
  return (
    <div className="grid gap-[16px] md:grid-cols-[minmax(0,220px)_1fr]">
      <dl className="space-y-[8px] text-[14px] text-black">
        <div>
          <dt className="text-black/50">결제 시간</dt>
          <dd className="font-medium">{payment.paidAt}</dd>
        </div>
        <div>
          <dt className="text-black/50">주문번호</dt>
          <dd className="font-medium">{payment.orderNumber}</dd>
        </div>
        <div>
          <dt className="text-black/50">결제 수단</dt>
          <dd className="font-medium">{payment.method}</dd>
        </div>
        <div>
          <dt className="text-black/50">결제 금액</dt>
          <dd className="font-medium">{payment.amount.toLocaleString()}원</dd>
        </div>
        <div>
          <dt className="text-black/50">상태</dt>
          <dd className="font-medium">{payment.status}</dd>
        </div>
      </dl>

      <div>
        <p className="mb-[8px] text-[14px] font-medium text-black">주문 메뉴</p>
        {!detail || detail.items.length === 0 ? (
          <p className="text-[14px] text-black/50">주문 상세를 불러올 수 없습니다.</p>
        ) : (
          <ul className="space-y-[10px]">
            {detail.items.map((item) => {
              const options = formatOrderItemOptionLabels(item.options);
              return (
                <li
                  key={item.id}
                  className="rounded-[10px] bg-canvas px-[14px] py-[10px] text-[14px] text-black"
                >
                  <p className="font-medium">
                    {item.menuName}
                    {item.quantity > 1 && (
                      <span className="ml-[6px] font-bold">x {item.quantity}</span>
                    )}
                    <span className="ml-[8px] text-black/50">
                      {item.lineAmount.toLocaleString()}원
                    </span>
                  </p>
                  {options.length > 0 && (
                    <ul className="mt-[4px] list-disc pl-[18px] text-[13px] text-black/70">
                      {options.map((opt) => (
                        <li key={opt}>{opt}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: string }) {
  return <th className="px-[16px] py-[20px] text-center">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-[16px] py-[18px] text-center text-black">{children}</td>;
}

function CancelPopup({
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
        <h2 className="text-[26px] font-medium tracking-[2px] text-black">
          정말 취소하시겠습니까?
        </h2>

        <p className="mt-[24px] text-[15px] font-medium tracking-[1px] text-black">
          취소할 주문
        </p>
        <p className="mt-[8px] text-[22px] font-medium tracking-[1.5px] text-black">
          주문번호 {payment.orderNumber} ({payment.amount.toLocaleString()}원)
        </p>

        <p className="mt-[24px] text-[15px] font-medium tracking-[1px] text-black">
          취소 사유 선택 <span style={{ color: "#ef4444" }}>(필수)</span>
        </p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-[10px] h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[15px] tracking-[1px] outline-none focus:border-black"
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
          <span className="text-[15px] tracking-[1px]" style={{ color: "#ef4444" }}>
            취소 완료 후 복구할 수 없습니다.
          </span>
        </div>

        <div className="mt-[20px] flex gap-[16px]">
          <button
            onClick={onClose}
            className="h-[48px] w-[130px] rounded-[10px] border border-black/50 bg-canvas text-[15px] font-medium tracking-[1px] text-black"
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
            className="h-[48px] flex-1 rounded-[10px] text-[15px] font-medium tracking-[1px] text-canvas disabled:opacity-40"
            style={{ backgroundColor: "#ef4444" }}
          >
            {submitting ? "취소 처리 중..." : "취소 처리"}
          </button>
        </div>
      </div>
    </div>
  );
}
