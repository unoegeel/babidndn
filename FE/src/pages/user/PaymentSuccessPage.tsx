import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { orderService, mapOrderDetailToOrder } from "../../services/user/orderService";
import type { OrderDetailResponse } from "../../types/api";
import { useUserData } from "../../store/UserDataContext";
import { saveOrderAccessToken } from "../../utils/orderAccessToken";
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

/** pendingOrder에 남아 있는 accessToken을 조회 맵에 재저장 — 결제 복귀 WebView/탭 간 유실 대비 */
function ensureAccessTokenFromPending(
  orderId: string | number,
  pending: OrderDetailResponse | null,
): void {
  if (pending?.accessToken && String(pending.id) === String(orderId)) {
    saveOrderAccessToken(orderId, pending.accessToken);
  }
}

async function fetchPaidOrderWithRetry(
  orderId: string,
  attempts = 3,
): Promise<OrderDetailResponse> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await orderService.getOrder(orderId);
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof ApiError && (err.status === 404 || err.status >= 500);
      if (!retryable || i === attempts - 1) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastError;
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

  /**
   * 접근 토큰·주문 상태를 먼저 준비한 뒤 현황으로 이동한다.
   * (이전: navigate 후 fire-and-forget getOrder → 첫 GET 404 / 치명 UI latch)
   * Push link는 OrderStatusPage ownership.
   */
  const goToOrderStatus = async (orderId: string | number, amount?: number) => {
    const id = String(orderId);
    const pending = readPendingOrder();
    ensureAccessTokenFromPending(id, pending);

    try {
      const detail = await fetchPaidOrderWithRetry(id);
      saveOrderToState(mapOrderDetailToOrder(detail));
    } catch (e) {
      console.error("결제 완료 주문 조회 실패:", e);
      // 토큰/네트워크 일시 실패여도 현황으로 보내 OrderStatusPage가 재시도하게 한다.
    }

    trackPaymentSuccess(id, amount);
    clearCart();
    clearPaymentStorage();
    navigate(`/user/orders/${id}`, { replace: true });
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

    // 백엔드에서 이미 승인 후 리다이렉트된 경우 — 주문 로드 후 현황으로 이동
    if (isBackendConfirmed && confirmedOrderId) {
      if (isRequestingRef.current) return;
      isRequestingRef.current = true;
      void goToOrderStatus(confirmedOrderId, readPendingOrder()?.totalAmount);
      return;
    }

    if (isInvalidParams) return;

    const sessionConfirmKey = `confirming_${tossOrderId}`;

    // 이전 시도가 승인까지 끝난 뒤 화면만 멈춘 경우 — pendingOrder로 복구
    if (isRequestingRef.current || sessionStorage.getItem(sessionConfirmKey) === "true") {
      const pending = readPendingOrder();
      if (pending?.id) {
        sessionStorage.removeItem(sessionConfirmKey);
        void goToOrderStatus(pending.id, pending.totalAmount);
      }
      return;
    }

    const pendingOrder = readPendingOrder();
    const amount = Number(amountStr);

    if (pendingOrder) {
      if (pendingOrder.tossOrderId !== tossOrderId) {
        queueMicrotask(() =>
          setErrorMsg("주문 번호 정보가 일치하지 않습니다. (위변조 가능성)"),
        );
        return;
      }
      if (pendingOrder.totalAmount !== amount) {
        queueMicrotask(() =>
          setErrorMsg("결제 요청 금액과 승인 시도 금액이 일치하지 않습니다. (금액 위변조 가능성)"),
        );
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
        return goToOrderStatus(res.orderId, pendingOrder?.totalAmount ?? amount);
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
          await goToOrderStatus(recoveredId, pending?.totalAmount ?? amount);
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
