import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import { orderService } from "../../services/user/orderService";
import type { OrderDetailResponse } from "../../types/api";

export const PaymentFailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { restoreCart } = useUserData();

  const code = searchParams.get("code") || "UNKNOWN_ERROR";
  const message = searchParams.get("message") || "결제 처리가 실패했거나 취소되었습니다.";

  useEffect(() => {
    const cleanup = async () => {
      // 결제 실패/취소 시 미결제 임시 주문 삭제
      try {
        const savedPending = sessionStorage.getItem("pendingOrder");
        if (savedPending) {
          const pending = JSON.parse(savedPending) as OrderDetailResponse;
          if (pending?.id) {
            await orderService.abandonUnpaidOrder(pending.id);
          }
        }
      } catch (err) {
        console.error("미결제 주문 삭제 실패:", err);
      }

      // 장바구니 복원
      try {
        const savedCart = sessionStorage.getItem("cartBackup");
        if (savedCart) {
          restoreCart(JSON.parse(savedCart));
        }
      } catch (err) {
        console.error("장바구니 복원 실패:", err);
      } finally {
        sessionStorage.removeItem("pendingOrder");
        sessionStorage.removeItem("cartBackup");
        orderService.clearOrderApiBaseUrl();
      }
    };

    void cleanup();
  }, [restoreCart]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center">
      <div className="bg-yellow-50 p-4 rounded-full mb-4">
        <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-base font-bold text-gray-800 mb-1">결제에 실패하였습니다</h2>
      <p className="text-xs text-gray-500 mb-1 font-semibold">{message}</p>
      <p className="text-[10px] text-gray-400 mb-6">(에러 코드: {code})</p>
      <button
        onClick={() => navigate("/user/checkout", { replace: true })}
        className="bg-black text-white py-3 px-6 rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors cursor-pointer"
      >
        주문서로 돌아가기
      </button>
    </div>
  );
};

export default PaymentFailPage;
