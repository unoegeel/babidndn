import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import MenuThumb from "../../components/user/MenuThumb";
import { orderService } from "../../services/user/orderService";
import { resolveApiBaseUrl } from "../../api/client";
import { formatSelectedOptions } from "../../utils/formatSelectedOptions";
import MarqueeText from "../../components/user/MarqueeText";
import { trackCheckoutView, trackPaymentStart } from "../../utils/userEvent/eventHelpers";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TossPayments?: any;
  }
}

type PaymentType = "NAVERPAY" | "TOSSPAY" | "PAYCO" | "KAKAOPAY" | "CREDITCARD";

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, createOrder } = useUserData();

  const [selectedMethod, setSelectedMethod] = useState<PaymentType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 결제 수단만 선택하면 결제 가능
  const isPaymentValid = selectedMethod !== null;

  // 장바구니가 비어있을 때 예외 처리
  useEffect(() => {
    if (cart.length === 0 && !isProcessing) {
      navigate("/user", { replace: true });
      return;
    }
    if (cart.length > 0) {
      trackCheckoutView(cart.length, cartTotal);
    }
  }, [cart, cartTotal, navigate, isProcessing]);

  if (cart.length === 0 && !isProcessing) {
    return null;
  }

  const handlePayment = async () => {
    if (!isPaymentValid || isProcessing || !selectedMethod) return;

    try {
      setIsProcessing(true);

      // 1. 백엔드 실제 주문 생성 (POST /api/orders)
      const createdOrder = await createOrder();

      trackPaymentStart(createdOrder.id, createdOrder.totalAmount, selectedMethod);

      // 2. 모바일 페이지 이동 및 성공/실패 콜백 대비 저장 (장바구니는 먼저 비우지 않음)
      const pendingJson = JSON.stringify(createdOrder);
      sessionStorage.setItem("pendingOrder", pendingJson);
      sessionStorage.setItem("cartBackup", JSON.stringify(cart));
      try {
        localStorage.setItem("pendingOrder", pendingJson);
        localStorage.setItem("cartBackup", JSON.stringify(cart));
      } catch {
        // localStorage 불가 시 무시
      }

      // 3. Toss Payments SDK 초기화 및 결제창 요청
      const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
      if (!clientKey) {
        alert("Toss Payments Client Key (VITE_TOSS_CLIENT_KEY)가 설정되지 않았습니다.");
        try {
          await orderService.abandonUnpaidOrder(createdOrder.id);
        } catch (e) {
          console.error("미결제 주문 삭제 실패:", e);
        }
        sessionStorage.removeItem("pendingOrder");
        sessionStorage.removeItem("cartBackup");
        setIsProcessing(false);
        return;
      }

      if (!window.TossPayments) {
        alert("Toss Payments SDK가 로드되지 않았습니다.");
        try {
          await orderService.abandonUnpaidOrder(createdOrder.id);
        } catch (e) {
          console.error("미결제 주문 삭제 실패:", e);
        }
        sessionStorage.removeItem("pendingOrder");
        sessionStorage.removeItem("cartBackup");
        setIsProcessing(false);
        return;
      }

      const tossPayments = window.TossPayments(clientKey);

      // 결제 승인은 API 도메인 successUrl에서 처리 후 웹으로 리다이렉트
      // (www/dev 웹 ≠ API 도메인이므로 Toss 콜백은 API로 직접 보냄)
      const feSuccessUrl = `${window.location.origin}/user/payment/success`;
      const apiBase = resolveApiBaseUrl() || window.location.origin;
      const successParams = new URLSearchParams({
        redirect: feSuccessUrl,
        internalOrderId: String(createdOrder.id),
      });
      const successUrl = `${apiBase}/api/payments/success?${successParams.toString()}`;
      const failUrl = `${window.location.origin}/user/payment/fail`;

      const orderName =
        cart.length > 1
          ? `${cart[0].menuName} 외 ${cart.length - 1}건`
          : cart[0].menuName;

      if (selectedMethod === "CREDITCARD") {
        tossPayments
          .requestPayment("카드", {
            amount: createdOrder.totalAmount,
            orderId: createdOrder.tossOrderId,
            orderName,
            successUrl,
            failUrl,
          })
          .catch(async (sdkErr: unknown) => {
            console.error("Toss SDK 요청 거부/취소:", sdkErr);
            try {
              await orderService.abandonUnpaidOrder(createdOrder.id);
            } catch (e) {
              console.error("미결제 주문 삭제 실패:", e);
            }
            sessionStorage.removeItem("pendingOrder");
            sessionStorage.removeItem("cartBackup");
            setIsProcessing(false);
          });
      } else {
        const easyPayMap: Record<string, string> = {
          TOSSPAY: "토스페이",
          NAVERPAY: "네이버페이",
          KAKAOPAY: "카카오페이",
          PAYCO: "페이코",
        };

        const easyPayName = easyPayMap[selectedMethod];
        if (easyPayName) {
          tossPayments
            .requestPayment("카드", {
              amount: createdOrder.totalAmount,
              orderId: createdOrder.tossOrderId,
              orderName,
              successUrl,
              failUrl,
              flowMode: "DIRECT",
              easyPay: easyPayName,
            })
            .catch(async (sdkErr: unknown) => {
              console.error("Toss SDK 요청 거부/취소:", sdkErr);
              try {
                await orderService.abandonUnpaidOrder(createdOrder.id);
              } catch (e) {
                console.error("미결제 주문 삭제 실패:", e);
              }
              sessionStorage.removeItem("pendingOrder");
              sessionStorage.removeItem("cartBackup");
              setIsProcessing(false);
            });
        } else {
          alert("지원되지 않는 결제 수단입니다.");
          try {
            await orderService.abandonUnpaidOrder(createdOrder.id);
          } catch (e) {
            console.error("미결제 주문 삭제 실패:", e);
          }
          sessionStorage.removeItem("pendingOrder");
          sessionStorage.removeItem("cartBackup");
          setIsProcessing(false);
        }
      }
    } catch (err: unknown) {
      console.error("주문/결제 요청 실패:", err);
      const errorMessage =
        err instanceof Error ? err.message : "주문 생성 중 문제가 발생했습니다. 다시 시도해 주세요.";
      alert(errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/30 overflow-hidden h-full relative">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* 1. 주문 요약 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-2">주문 요약</h2>
          <div className="space-y-3">
            {cart.map((item) => {
              const optionNames = formatSelectedOptions(item.selectedOptions);
              return (
                <div key={item.cartItemId} className="flex gap-4 items-start py-1">
                  <div className="flex h-[50px] w-[50px] flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-[#F8F9FA]">
                    <MenuThumb
                      src={item.imageUrl}
                      alt={item.menuName}
                      placeholderClassName="text-gray-400 font-medium text-[11px]"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-gray-800 truncate">{item.menuName}</h3>
                    {optionNames && (
                      <MarqueeText
                        text={optionNames}
                        className="mt-0.5"
                        textClassName="text-[11px] text-gray-400"
                      />
                    )}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[11px] text-gray-400">{item.quantity}개</span>
                      <span className="text-xs font-bold text-gray-800">
                        {item.totalPrice.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. 결제 수단 선택 (상세 요약 박스 제거 후 바로 결제 수단 배치) */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-2">결제 수단 선택</h2>

          <div className="space-y-2">
            {/* 1행: 네이버페이 · 토스페이 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedMethod("NAVERPAY")}
                className={`py-3 px-1.5 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border min-h-[64px] ${
                  selectedMethod === "NAVERPAY"
                    ? "bg-[#03C75A] text-white border-[#03C75A]"
                    : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                }`}
              >
                <span className="text-[10px] font-bold mb-0.5 leading-snug">N Pay</span>
                <span className="text-[11px] leading-snug">네이버페이</span>
              </button>

              <button
                onClick={() => setSelectedMethod("TOSSPAY")}
                className={`py-3 px-1.5 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border min-h-[64px] ${
                  selectedMethod === "TOSSPAY"
                    ? "bg-[#0064FF] text-white border-[#0064FF]"
                    : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                }`}
              >
                <span className="text-[10px] font-bold mb-0.5 leading-snug">toss pay</span>
                <span className="text-[11px] leading-snug">토스페이</span>
              </button>
            </div>

            {/* 2행: 페이코 · 카카오페이 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedMethod("PAYCO")}
                className={`py-3 px-1.5 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border min-h-[64px] ${
                  selectedMethod === "PAYCO"
                    ? "bg-[#FF0000] text-white border-[#FF0000]"
                    : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                }`}
              >
                <span className="text-[10px] font-bold mb-0.5 leading-snug">PAYCO</span>
                <span className="text-[11px] leading-snug">페이코</span>
              </button>

              <button
                onClick={() => setSelectedMethod("KAKAOPAY")}
                className={`py-3 px-1.5 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border min-h-[64px] ${
                  selectedMethod === "KAKAOPAY"
                    ? "bg-[#FFE600] text-black border-[#FFE600]"
                    : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                }`}
              >
                <span className="text-[10px] font-bold mb-0.5 leading-snug">kakao pay</span>
                <span className="text-[11px] leading-snug">카카오페이</span>
              </button>
            </div>

            {/* 3행: 신용/체크카드 전체 너비 */}
            <button
              onClick={() => setSelectedMethod("CREDITCARD")}
              className={`w-full py-3 px-1.5 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border min-h-[64px] ${
                selectedMethod === "CREDITCARD"
                  ? "bg-black text-white border-black"
                  : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
              }`}
            >
              <span className="text-[10px] font-bold mb-0.5 leading-snug">CARD</span>
              <span className="text-[11px] whitespace-nowrap leading-snug">신용/체크카드</span>
            </button>
          </div>
        </div>
      </div>

      {/* 하단 고정 결제하기 버튼 (shrink-0 영역) */}
      <div
        className="z-40 shrink-0 border-t border-gray-100 bg-white px-4 pt-3"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={handlePayment}
          disabled={!isPaymentValid || isProcessing}
          className={`flex w-full items-center justify-center rounded-xl border py-3.5 text-sm font-bold transition-all ${
            isPaymentValid && !isProcessing
              ? "cursor-pointer border-[#D8B47E] bg-[#D8B47E] text-white shadow-md hover:bg-[#C59B62]"
              : "cursor-not-allowed border-transparent bg-[#D8B47E]/40 text-white/60 shadow-none"
          }`}
        >
          {isProcessing ? (
            <span className="text-xs font-bold">결제 진행 중...</span>
          ) : (
            `총 ${cartTotal.toLocaleString()}원 결제하기`
          )}
        </button>
      </div>

      {/* 로딩 오버레이 */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/70 z-50 flex flex-col items-center justify-center text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-3"></div>
          <p className="text-xs font-bold text-gray-700 font-semibold">결제 창을 연결하고 있습니다</p>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
