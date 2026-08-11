import { forwardRef } from "react";
import type { ReceiptViewModel } from "../../types/receipt";
import { formatPaymentStatusLabel } from "../../utils/formatPaymentStatusLabel";
import { formatServerDateTimeDash } from "../../utils/serverDate";
import { sortReceiptOptions } from "../../utils/sortReceiptOptions";

interface ReceiptTemplateProps {
  receipt: ReceiptViewModel;
}

function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

/**
 * 전자영수증 공통 템플릿 (감열 영수증 스타일 세로형).
 * PNG/PDF 캡처용 ref를 외부에 노출한다.
 *
 * 색상은 Tailwind 유틸(oklch/color-mix) 대신 hex/rgba 인라인을 쓴다.
 * html2canvas 1.4.x 가 oklch 파싱에 실패하기 때문이다.
 */
export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  function ReceiptTemplate({ receipt }, ref) {
    return (
      <div
        ref={ref}
        className="mx-auto w-full max-w-[320px]"
        style={{
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: '"Pretendard", system-ui, -apple-system, sans-serif',
          boxSizing: "border-box",
        }}
      >
        <div style={{ padding: "20px 16px" }}>
          <header style={{ textAlign: "center" }}>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.04em",
                color: "#000000",
              }}
            >
              바비든든
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(0,0,0,0.7)",
              }}
            >
              전자영수증
            </p>
          </header>

          <div
            style={{
              margin: "12px 0",
              borderTop: "1px dashed rgba(0,0,0,0.3)",
            }}
          />

          <dl style={{ margin: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 6,
                fontSize: 11,
              }}
            >
              <dt style={{ flexShrink: 0, color: "rgba(0,0,0,0.6)" }}>픽업번호</dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  color: "#000000",
                }}
              >
                {receipt.pickupNumber}
              </dd>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                fontSize: 11,
              }}
            >
              <dt style={{ flexShrink: 0, color: "rgba(0,0,0,0.6)" }}>주문일시</dt>
              <dd
                style={{
                  margin: 0,
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  color: "#000000",
                }}
              >
                {formatServerDateTimeDash(receipt.orderedAt)}
              </dd>
            </div>
          </dl>

          <div
            style={{
              margin: "12px 0",
              borderTop: "1px dashed rgba(0,0,0,0.3)",
            }}
          />

          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {receipt.items.map((item, idx) => {
              const options = sortReceiptOptions(item.options);
              return (
                <li
                  key={`${item.menuName}-${idx}`}
                  style={{ marginBottom: idx < receipt.items.length - 1 ? 12 : 0 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#000000",
                    }}
                  >
                    <span style={{ minWidth: 0, wordBreak: "break-word" }}>
                      {item.menuName}
                      <span
                        style={{
                          marginLeft: 4,
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        x{item.quantity}
                      </span>
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatWon(item.lineAmount)}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 10,
                      color: "rgba(0,0,0,0.55)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    단가 {formatWon(item.menuPrice)}
                  </p>
                  {options.length > 0 && (
                    <ul
                      style={{
                        margin: "6px 0 0",
                        padding: "0 0 0 8px",
                        listStyle: "none",
                        borderLeft: "1px solid rgba(0,0,0,0.15)",
                      }}
                    >
                      {options.map((opt, oi) => (
                        <li
                          key={`${opt.name}-${oi}`}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 8,
                            marginTop: oi > 0 ? 2 : 0,
                            fontSize: 10,
                            color: "rgba(0,0,0,0.75)",
                          }}
                        >
                          <span style={{ minWidth: 0, wordBreak: "break-word" }}>
                            · {opt.name}
                            {opt.quantity > 1 ? (
                              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                                {" "}
                                x{opt.quantity}
                              </span>
                            ) : null}
                          </span>
                          <span
                            style={{
                              flexShrink: 0,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {opt.additionalPrice > 0
                              ? `+${formatWon(opt.additionalPrice * opt.quantity)}`
                              : "-"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <div
            style={{
              margin: "12px 0",
              borderTop: "1px solid rgba(0,0,0,0.4)",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#000000" }}>
              총 결제금액
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
                color: "#000000",
              }}
            >
              {formatWon(receipt.totalAmount)}
            </span>
          </div>

          {receipt.payment && (
            <>
              <div
                style={{
                  margin: "12px 0",
                  borderTop: "1px dashed rgba(0,0,0,0.3)",
                }}
              />
              <dl style={{ margin: 0, fontSize: 11 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <dt style={{ flexShrink: 0, color: "rgba(0,0,0,0.6)" }}>결제수단</dt>
                  <dd style={{ margin: 0, fontWeight: 600, color: "#000000" }}>
                    {receipt.payment.methodLabel || "-"}
                  </dd>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: receipt.payment.approvedAt ? 6 : 0,
                  }}
                >
                  <dt style={{ flexShrink: 0, color: "rgba(0,0,0,0.6)" }}>결제상태</dt>
                  <dd style={{ margin: 0, fontWeight: 500, color: "#000000" }}>
                    {formatPaymentStatusLabel(receipt.payment.status)}
                  </dd>
                </div>
                {receipt.payment.approvedAt && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <dt style={{ flexShrink: 0, color: "rgba(0,0,0,0.6)" }}>승인일시</dt>
                    <dd
                      style={{
                        margin: 0,
                        fontWeight: 500,
                        fontVariantNumeric: "tabular-nums",
                        color: "#000000",
                      }}
                    >
                      {formatServerDateTimeDash(receipt.payment.approvedAt)}
                    </dd>
                  </div>
                )}
                {receipt.payment.amountMismatch && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 10,
                      lineHeight: 1.4,
                      color: "rgba(0,0,0,0.5)",
                    }}
                  >
                    ※ 주문 금액({formatWon(receipt.totalAmount)})과 결제 승인 금액(
                    {formatWon(receipt.payment.amount)})이 다릅니다. 표시 금액은 주문
                    총액을 기준으로 합니다.
                  </p>
                )}
              </dl>
            </>
          )}

          <div
            style={{
              margin: "12px 0",
              borderTop: "1px dashed rgba(0,0,0,0.3)",
            }}
          />
          <p
            style={{
              margin: 0,
              textAlign: "center",
              fontSize: 10,
              lineHeight: 1.5,
              color: "rgba(0,0,0,0.45)",
            }}
          >
            이용해 주셔서 감사합니다.
          </p>
        </div>
      </div>
    );
  },
);

export default ReceiptTemplate;
