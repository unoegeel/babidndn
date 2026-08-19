import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { orderService, mapOrderDetailToOrder } from "../../services/user/orderService";
import type { OrderDetailResponse } from "../../types/api";
import { useUserData } from "../../store/UserDataContext";
import { linkPushSubscriptionToOrder } from "../../utils/webPush";
import { trackPaymentSuccess } from "../../utils/userEvent/eventHelpers";

function readPendingOrder(): OrderDetailResponse | null {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const saved = storage.getItem("pendingOrder");
      if (saved) {
        return JSON.parse(saved) as OrderDetailResponse;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function clearPaymentStorage(): void {
  sessionStorage.removeItem("pendingOrder");
  sessionStorage.removeItem("cartBackup");
  localStorage.removeItem("pendingOrder");
  localStorage.removeItem("cartBackup");
  orderService.clearOrderApiBaseUrl();
}

function parseOrderIdFromAlreadyProcessed(message: string): string | null {
  const match = message.match(/orderId=(\d+)/);
  return match?.[1] ?? null;
}

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart, restoreCart, saveOrderToState } = useUserData();

  const paymentKey = searchParams.get("paymentKey");
  const tossOrderId = searchParams.get("orderId");
  const amountStr = searchParams.get("amount");
  const confirmedOrderId = searchParams.get("confirmedOrderId");
  const paymentError = searchParams.get("paymentError");

  const [errorMsg, setErrorMsg] = useState<string | null>(paymentError);
  const isRequestingRef = useRef(false);

  const isBackendConfirmed = Boolean(confirmedOrderId);
  const isInvalidParams = !isBackendConfirmed && (!paymentKey || !tossOrderId || !amountStr);

  const goToOrderStatus = (orderId: string | number, amount?: number) => {
    const id = String(orderId);
    trackPaymentSuccess(id, amount);
    clearCart();
    clearPaymentStorage();
    void linkPushSubscriptionToOrder(id);
    navigate(`/user/orders/${id}`, { replace: true });

    // 현황 페이지에서도 조회하지만, 가능하면 로컬 상태도 미리 채움 (실패해도 이동은 완료된 상태)
    void orderService
      .getOrder(id)
      .then((detail) => saveOrderToState(mapOrderDetailToOrder(detail)))
      .catch((e) => console.error("결제 완료 주문 조회 실패:", e));
  };

  const restoreCartAndClear = async () => {
    try {
      const savedCart = sessionStorage.getItem("cartBackup") ?? localStorage.getItem("cartBackup");
      if (savedCart) {
        restoreCart(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error("장바구니 복원 실패:", e);
    } finally {
      clearPaymentStorage();
    }
  };

  useEffect(() => {
    if (paymentError) {
      void (async () => {
        try {
          const pending = readPendingOrder();
          if (pending?.id) {
            await orderService.abandonUnpaidOrder(pending.id);
          }
        } catch (e) {
          console.error("미결제 주문 삭제 실패:", e);
        }
        await restoreCartAndClear();
      })();
      return;
    }

    // 백엔드에서 이미 승인 후 리다이렉트된 경우 — 즉시 현황으로 이동
    if (isBackendConfirmed && confirmedOrderId) {
      if (isRequestingRef.current) return;
      isRequestingRef.current = true;
      goToOrderStatus(confirmedOrderId, readPendingOrder()?.totalAmount);
      return;
    }

    if (isInvalidParams) return;

    const sessionConfirmKey = `confirming_${tossOrderId}`;

    // 이전 시도가 승인까지 끝난 뒤 화면만 멈춘 경우 — pendingOrder로 복구
    if (isRequestingRef.current || sessionStorage.getItem(sessionConfirmKey) === "true") {
      const pending = readPendingOrder();
      if (pending?.id) {
        sessionStorage.removeItem(sessionConfirmKey);
        goToOrderStatus(pending.id, pending.totalAmount);
      }
      return;
    }

    const pendingOrder = readPendingOrder();
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

    orderService
      .confirmPayment({
        paymentKey: paymentKey!,
        orderId: tossOrderId!,
        amount,
        internalOrderId: pendingOrder?.id,
      })
      .then((res) => {
        sessionStorage.removeItem(sessionConfirmKey);
        goToOrderStatus(res.orderId, pendingOrder?.totalAmount ?? amount);
      })
      .catch(async (err: unknown) => {
        console.error("결제 승인 실패:", err);
        sessionStorage.removeItem(sessionConfirmKey);
        isRequestingRef.current = false;

        // 백엔드 successUrl에서 이미 승인된 뒤 FE가 다시 호출한 경우 → 현황으로 이동
        const pending = readPendingOrder();
        const alreadyProcessed =
          err instanceof ApiError && err.code === "PAYMENT_ALREADY_PROCESSED";
        const recoveredId =
          (alreadyProcessed && pending?.id
            ? String(pending.id)
            : null) ??
          (err instanceof Error ? parseOrderIdFromAlreadyProcessed(err.message) : null) ??
          (pending?.id ? String(pending.id) : null);

        if (alreadyProcessed && recoveredId) {
          goToOrderStatus(recoveredId, pending?.totalAmount ?? amount);
          return;
        }

        const message = err instanceof Error ? err.message : "결제 승인 처리 중 오류가 발생했습니다.";
        setErrorMsg(message);

        try {
          if (pending?.id && !alreadyProcessed) {
            await orderService.abandonUnpaidOrder(pending.id);
          }
        } catch (e) {
          console.error("미결제 주문 삭제 실패:", e);
        }

        await restoreCartAndClear();
      });
  }, [
    paymentKey,
    tossOrderId,
    amountStr,
    confirmedOrderId,
    paymentError,
    isBackendConfirmed,
    isInvalidParams,
    clearCart,
    restoreCart,
    saveOrderToState,
    navigate,
  ]);

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
