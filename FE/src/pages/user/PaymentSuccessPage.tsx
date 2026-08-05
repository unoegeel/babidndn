import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { orderService, mapOrderDetailToOrder, type OrderDetailResponse } from "../../services/user/orderService";
import { useUserData } from "../../store/UserDataContext";
import { linkPushSubscriptionToOrder } from "../../utils/webPush";

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart, restoreCart, saveOrderToState } = useUserData();

  const paymentKey = searchParams.get("paymentKey");
  const tossOrderId = searchParams.get("orderId"); // Toss 문자열 orderId
  const amountStr = searchParams.get("amount");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isRequestingRef = useRef(false);

  // 1. URL 쿼리 기본 유효성 검사
  const isInvalidParams = !paymentKey || !tossOrderId || !amountStr;

  useEffect(() => {
    if (isInvalidParams) return;

    // React StrictMode 및 중복 진입 방지 (useRef + sessionStorage 조합)
    const sessionConfirmKey = `confirming_${tossOrderId}`;
    if (isRequestingRef.current || sessionStorage.getItem(sessionConfirmKey) === "true") {
      return;
    }

    // 2. pendingOrder 검증 (결제 금액 및 tossOrderId 위변조 체크)
    let pendingOrder: OrderDetailResponse | null = null;
    try {
      const savedPending = sessionStorage.getItem("pendingOrder");
      if (savedPending) {
        pendingOrder = JSON.parse(savedPending) as OrderDetailResponse;
      }
    } catch (e) {
      console.error("pendingOrder 파싱 실패:", e);
    }

    const amount = Number(amountStr);

    if (pendingOrder) {
      if (pendingOrder.tossOrderId !== tossOrderId) {
        setErrorMsg("주문 번호 정보가 일치하지 않습니다. (위변조 가능성)");
        return;
      }
      if (pendingOrder.totalAmount !== amount) {
        setErrorMsg("결제 요청 금액과 승인 시도 금액이 일치하지 않습니다. (금액 위변조 가능성)");
        return;
      }
    }

    isRequestingRef.current = true;
    sessionStorage.setItem(sessionConfirmKey, "true");

    // 3. 결제 승인 요청 (POST /api/payments/confirm)
    orderService
      .confirmPayment({
        paymentKey,
        orderId: tossOrderId,
        amount,
        internalOrderId: pendingOrder?.id,
      })
      .then(async (res) => {
        // 승인 완료 시 임시 저장소 및 장바구니 비우기
        sessionStorage.removeItem("pendingOrder");
        sessionStorage.removeItem("cartBackup");
        sessionStorage.removeItem(sessionConfirmKey);
        clearCart();

        // 결제 확정 후 발급된 픽업번호 포함 주문을 로컬 내역에 반영
        try {
          const detail = await orderService.getOrder(res.orderId);
          saveOrderToState(mapOrderDetailToOrder(detail));
        } catch (e) {
          console.error("결제 완료 주문 조회 실패:", e);
        } finally {
          orderService.clearOrderApiBaseUrl();
        }

        // 백엔드 숫자형 id (res.orderId) 기반 주문 현황 페이지 이동
        const backendOrderId = String(res.orderId);
        void linkPushSubscriptionToOrder(backendOrderId);
        navigate(`/user/orders/${backendOrderId}`, { replace: true });
      })
      .catch(async (err: unknown) => {
        console.error("결제 승인 실패:", err);
        // 실패 시 중복 방지 세션 해제하여 재시도 가능하게 함
        sessionStorage.removeItem(sessionConfirmKey);
        isRequestingRef.current = false;

        const message = err instanceof Error ? err.message : "결제 승인 처리 중 오류가 발생했습니다.";
        setErrorMsg(message);

        // 미결제 임시 주문 정리 + 장바구니 복원
        try {
          const savedPending = sessionStorage.getItem("pendingOrder");
          if (savedPending) {
            const pending = JSON.parse(savedPending) as OrderDetailResponse;
            if (pending?.id) {
              await orderService.abandonUnpaidOrder(pending.id);
            }
          }
        } catch (e) {
          console.error("미결제 주문 삭제 실패:", e);
        }

        try {
          const savedCart = sessionStorage.getItem("cartBackup");
          if (savedCart) {
            restoreCart(JSON.parse(savedCart));
          }
        } catch (e) {
          console.error("장바구니 복원 실패:", e);
        } finally {
          sessionStorage.removeItem("pendingOrder");
          sessionStorage.removeItem("cartBackup");
          orderService.clearOrderApiBaseUrl();
        }
      });
  }, [paymentKey, tossOrderId, amountStr, isInvalidParams, clearCart, restoreCart, saveOrderToState, navigate]);

  const displayError = isInvalidParams ? "결제 검증 파라미터가 유효하지 않습니다." : errorMsg;

  if (displayError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-gray-800 mb-1">결제 승인 실패</h2>
        <p className="text-xs text-gray-500 mb-6">{displayError}</p>
        <button
          onClick={() => navigate("/user/checkout", { replace: true })}
          className="bg-black text-white py-3 px-6 rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors cursor-pointer"
        >
          주문서로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-3"></div>
      <p className="text-xs font-bold text-gray-700">결제를 최종 승인하고 있습니다...</p>
    </div>
  );
};

export default PaymentSuccessPage;
