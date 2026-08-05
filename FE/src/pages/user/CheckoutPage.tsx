import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import MenuThumb from "../../components/user/MenuThumb";
import { orderService } from "../../services/user/orderService";
import { formatSelectedOptions } from "../../utils/formatSelectedOptions";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TossPayments?: any;
  }
}

type PaymentType = "NAVERPAY" | "TOSSPAY" | "PAYCO" | "KAKAOPAY" | "APPLEPAY" | "CREDITCARD";

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, createOrder } = useUserData();

  const [selectedMethod, setSelectedMethod] = useState<PaymentType | null>(null);
  const [selectedCardCompany, setSelectedCardCompany] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 결제 수단 유효성 검사 (결제수단 선택 필수, 신용카드의 경우 카드사 선택 필수)
  const isPaymentValid =
    selectedMethod !== null && (selectedMethod !== "CREDITCARD" || selectedCardCompany !== "");

  // 장바구니가 비어있을 때 예외 처리
  useEffect(() => {
    if (cart.length === 0 && !isProcessing) {
      navigate("/user", { replace: true });
    }
  }, [cart, navigate, isProcessing]);

  if (cart.length === 0 && !isProcessing) {
    return null;
  }

  const handlePayment = async () => {
    if (!isPaymentValid || isProcessing || !selectedMethod) return;

    try {
      setIsProcessing(true);

      // 1. 백엔드 실제 주문 생성 (POST /api/orders)
      const createdOrder = await createOrder(selectedMethod);

      // 2. 모바일 페이지 이동 및 성공/실패 콜백 대비 sessionStorage 저장 (장바구니는 먼저 비우지 않음)
      sessionStorage.setItem("pendingOrder", JSON.stringify(createdOrder));
      sessionStorage.setItem("cartBackup", JSON.stringify(cart));

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

      const successUrl = `${window.location.origin}/user/payment/success`;
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
          APPLEPAY: "애플페이",
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
                      placeholderClassName="text-gray-400 font-bold text-[10px]"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-gray-800 truncate">{item.menuName}</h3>
                    {optionNames && (
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{optionNames}</p>
                    )}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-gray-400">{item.quantity}개</span>
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

          {/* 3열 2행 그리드 배치 (총 6개) */}
          <div className="grid grid-cols-3 gap-2">
            {/* 네이버페이 */}
            <button
              onClick={() => setSelectedMethod("NAVERPAY")}
              className={`py-3 px-1.5 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border min-h-[64px] ${
                selectedMethod === "NAVERPAY"
                  ? "bg-[#03C75A] text-white border-[#03C75A]"
                  : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
              }`}
            >
              <span className="text-[9px] font-extrabold mb-0.5">N Pay</span>
              <span className="text-[10px]">네이버페이</span>
            </button>

            {/* 토스페이 */}
            <button
              onClick={() => setSelectedMethod("TOSSPAY")}
              className={`py-3 px-1.5 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border min-h-[64px] ${
                selectedMethod === "TOSSPAY"
                  ? "bg-[#0064FF] text-white border-[#0064FF]"
                  : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
              }`}
            >
              <span className="text-[9px] font-extrabold mb-0.5">toss pay</span>
              <span className="text-[10px]">토스페이</span>
            </button>

            {/* 페이코 */}
            <button
              onClick={() => setSelectedMethod("PAYCO")}
              className={`py-3 px-1.5 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border min-h-[64px] ${
                selectedMethod === "PAYCO"
                  ? "bg-[#FF0000] text-white border-[#FF0000]"
                  : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
              }`}
            >
              <span className="text-[9px] font-extrabold mb-0.5">PAYCO</span>
              <span className="text-[10px]">페이코</span>
            </button>

            {/* 카카오페이 */}
            <button
              onClick={() => setSelectedMethod("KAKAOPAY")}
              className={`py-3 px-1.5 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border min-h-[64px] ${
                selectedMethod === "KAKAOPAY"
                  ? "bg-[#FFE600] text-black border-[#FFE600]"
                  : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
              }`}
            >
              <span className="text-[9px] font-extrabold mb-0.5">pay</span>
              <span className="text-[10px]">카카오페이</span>
            </button>

            {/* 애플페이 */}
            <button
              onClick={() => setSelectedMethod("APPLEPAY")}
              className={`py-3 px-1.5 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border min-h-[64px] ${
                selectedMethod === "APPLEPAY"
                  ? "bg-black text-white border-black"
                  : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
              }`}
            >
              <span className="text-[9px] font-bold mb-0.5"> Pay</span>
              <span className="text-[10px]">Apple Pay</span>
            </button>

            {/* 신용카드/체크카드 */}
            <button
              onClick={() => setSelectedMethod("CREDITCARD")}
              className={`py-3 px-1.5 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer border min-h-[64px] ${
                selectedMethod === "CREDITCARD"
                  ? "bg-black text-white border-black"
                  : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
              }`}
            >
              <span className="text-[9px] font-bold mb-0.5">CARD</span>
              <span className="text-[10px] whitespace-nowrap">신용/체크카드</span>
            </button>
          </div>

          {/* 신용카드/체크카드를 선택한 경우에만 카드사 선택 드롭다운 표시 */}
          {selectedMethod === "CREDITCARD" && (
            <div className="pt-2 animate-fade-in">
              <label className="text-[10px] font-bold text-gray-400 block mb-1">카드사 선택</label>
              <div className="relative">
                <select
                  value={selectedCardCompany}
                  onChange={(e) => setSelectedCardCompany(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-800 appearance-none focus:outline-none focus:border-gray-400 cursor-pointer"
                >
                  <option value="">카드를 선택해 주세요</option>
                  <option value="SHINHAN">신한카드</option>
                  <option value="KOOKMIN">국민카드</option>
                  <option value="SAMSUNG">삼성카드</option>
                  <option value="HYUNDAI">현대카드</option>
                  <option value="LOTTE">롯데카드</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
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
