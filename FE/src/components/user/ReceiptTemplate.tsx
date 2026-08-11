import { forwardRef } from "react";
import type { ReceiptViewModel } from "../../types/receipt";
import { formatServerDateTimeDash } from "../../utils/serverDate";

interface ReceiptTemplateProps {
  receipt: ReceiptViewModel;
}

function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

/**
 * 전자영수증 공통 템플릿 (감열 영수증 스타일 세로형).
 * PNG/PDF 캡처용 ref를 외부에 노출한다.
 */
export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  function ReceiptTemplate({ receipt }, ref) {
    return (
      <div
        ref={ref}
        className="mx-auto w-full max-w-[320px] bg-white text-black"
        style={{
          fontFamily: '"Pretendard", system-ui, -apple-system, sans-serif',
          boxSizing: "border-box",
        }}
      >
        <div className="px-4 py-5">
          <header className="text-center">
            <p className="text-[15px] font-extrabold tracking-wide">바비든든</p>
            <p className="mt-1 text-[11px] font-semibold text-black/70">전자영수증</p>
          </header>

          <div className="my-3 border-t border-dashed border-black/30" />

          <dl className="space-y-1.5 text-[11px]">
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-black/60">주문번호</dt>
              <dd className="min-w-0 break-all text-right font-semibold">{receipt.tossOrderId}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-black/60">픽업번호</dt>
              <dd className="text-right text-[20px] font-extrabold leading-none tabular-nums">
                {receipt.pickupNumber}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-black/60">주문일시</dt>
              <dd className="text-right font-medium tabular-nums">
                {formatServerDateTimeDash(receipt.orderedAt)}
              </dd>
            </div>
          </dl>

          <div className="my-3 border-t border-dashed border-black/30" />

          <ul className="space-y-3">
            {receipt.items.map((item, idx) => (
              <li key={`${item.menuName}-${idx}`}>
                <div className="flex items-start justify-between gap-2 text-[12px] font-bold">
                  <span className="min-w-0 break-words">
                    {item.menuName}
                    <span className="ml-1 font-semibold tabular-nums">x{item.quantity}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatWon(item.lineAmount)}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-black/55 tabular-nums">
                  단가 {formatWon(item.menuPrice)}
                </p>
                {item.options.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 border-l border-black/15 pl-2">
                    {item.options.map((opt, oi) => (
                      <li
                        key={`${opt.name}-${oi}`}
                        className="flex items-start justify-between gap-2 text-[10px] text-black/75"
                      >
                        <span className="min-w-0 break-words">
                          · {opt.name}
                          {opt.quantity > 1 ? (
                            <span className="tabular-nums"> x{opt.quantity}</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {opt.additionalPrice > 0
                            ? `+${formatWon(opt.additionalPrice * opt.quantity)}`
                            : "-"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <div className="my-3 border-t border-black/40" />

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12px] font-bold">총 결제금액</span>
            <span className="text-[16px] font-extrabold tabular-nums">
              {formatWon(receipt.totalAmount)}
            </span>
          </div>

          {receipt.payment && (
            <>
              <div className="my-3 border-t border-dashed border-black/30" />
              <dl className="space-y-1.5 text-[11px]">
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-black/60">결제수단</dt>
                  <dd className="text-right font-semibold">
                    {receipt.payment.methodLabel || "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-black/60">결제상태</dt>
                  <dd className="text-right font-medium">{receipt.payment.status}</dd>
                </div>
                {receipt.payment.approvedAt && (
                  <div className="flex justify-between gap-3">
                    <dt className="shrink-0 text-black/60">승인일시</dt>
                    <dd className="text-right font-medium tabular-nums">
                      {formatServerDateTimeDash(receipt.payment.approvedAt)}
                    </dd>
                  </div>
                )}
                {receipt.payment.amountMismatch && (
                  <p className="pt-1 text-[10px] leading-snug text-black/50">
                    ※ 주문 금액({formatWon(receipt.totalAmount)})과 결제 승인
                    금액({formatWon(receipt.payment.amount)})이 다릅니다. 표시
                    금액은 주문 총액을 기준으로 합니다.
                  </p>
                )}
              </dl>
            </>
          )}

          <div className="my-3 border-t border-dashed border-black/30" />
          <p className="text-center text-[10px] leading-relaxed text-black/45">
            이용해 주셔서 감사합니다.
          </p>
        </div>
      </div>
    );
  },
);

export default ReceiptTemplate;
