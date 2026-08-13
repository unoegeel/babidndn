import type { MouseEvent } from "react";
import type { Payment } from "../../../types/admin";
import type { OrderDetailResponse } from "../../../types/api";
import { PaymentDetailPanel } from "./PaymentDetailPanel";

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-[16px] py-[18px] text-center text-black">{children}</td>;
}

export function PaymentRow({
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
            className="font-medium"
            style={{
              color:
                payment.status === "결제완료"
                  ? "#22c55e"
                  : payment.status === "결제취소" ||
                      payment.status === "부분취소"
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
              className="h-[40px] w-[110px] rounded-[10px] border border-danger bg-canvas text-[15px] font-medium text-danger"
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
