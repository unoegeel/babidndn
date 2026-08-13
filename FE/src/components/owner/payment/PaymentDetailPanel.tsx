import { useMemo, useState } from "react";
import { useAdminData } from "../../../store/AdminDataContext";
import type { Payment } from "../../../types/admin";
import type { OrderDetailResponse } from "../../../types/api";
import { buildReceiptViewModel } from "../../../utils/buildReceiptViewModel";
import { formatOrderItemOptionLabels } from "../../../utils/orderItemOptions";
import { ReceiptPopup } from "./ReceiptPopup";

export function PaymentDetailPanel({
  payment,
  detail,
}: {
  payment: Payment;
  detail: OrderDetailResponse | undefined;
}) {
  const { getPaymentByOrderId } = useAdminData();
  const [receiptOpen, setReceiptOpen] = useState(false);

  const paymentApi =
    payment.orderId !== undefined
      ? getPaymentByOrderId(payment.orderId)
      : undefined;

  const receipt = useMemo(() => {
    if (!detail) return null;
    return buildReceiptViewModel(detail, paymentApi ?? null);
  }, [detail, paymentApi]);

  return (
    <div className="space-y-[20px]">
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
          <div className="pt-[4px]">
            <button
              type="button"
              disabled={!receipt}
              onClick={(e) => {
                e.stopPropagation();
                setReceiptOpen(true);
              }}
              className="h-[40px] w-full rounded-[10px] border border-black/50 bg-canvas text-[14px] font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              전자영수증
            </button>
            {!receipt && (
              <p className="mt-[6px] text-[12px] text-black/45">
                주문 상세가 없어 전자영수증을 열 수 없습니다.
              </p>
            )}
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

      {receiptOpen && receipt && (
        <ReceiptPopup receipt={receipt} onClose={() => setReceiptOpen(false)} />
      )}
    </div>
  );
}
