import React from "react";
import { useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";
import MenuThumb from "../../components/user/MenuThumb";

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, updateCartQuantity, removeFromCart, clearCart } = useUserData();

  const handleQtyChange = (cartItemId: string, currentQty: number, val: number) => {
    updateCartQuantity(cartItemId, currentQty + val);
  };

  // 장바구니가 비어있을 때 예외 처리
  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white text-center">
        <div className="bg-gray-50 p-6 rounded-full mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-gray-800 mb-1">장바구니가 비어있습니다</h2>
        <p className="text-xs text-gray-400 mb-6">맛있는 컵밥을 골라 담아보세요!</p>
        <button
          onClick={() => navigate("/user")}
          className="bg-black text-white py-3 px-6 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors cursor-pointer"
        >
          메뉴 보러가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 overflow-hidden h-full">
      {/* 상단 장바구니 제어 */}
      <div className="shrink-0 bg-white px-4 py-3 flex justify-between items-center border-b border-gray-100">
        <span className="text-xs font-bold text-gray-500">담은 상품 {cart.length}개</span>
        <button
          onClick={clearCart}
          className="text-xs font-bold text-red-500 hover:text-red-600 focus:outline-none cursor-pointer"
        >
          전체 삭제
        </button>
      </div>

      {/* 장바구니 목록 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {cart.map((item) => {
          // 옵션 텍스트 조합 (예: "기본 / 참치 토핑")
          const optionNames = item.selectedOptions.map((opt) => opt.name).join(" / ");
          return (
            <div
              key={item.cartItemId}
              className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-4 shadow-sm"
            >
              {/* 상품 이미지 */}
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                <MenuThumb src={item.imageUrl} alt={item.menuName} />
              </div>

              {/* 상품 정보 */}
              <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-bold text-gray-900 truncate pr-2">{item.menuName}</h3>
                    {/* 개별 삭제 버튼 */}
                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none p-0.5 cursor-pointer"
                      aria-label="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {optionNames && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{optionNames}</p>
                  )}
                </div>

                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-bold text-gray-900">
                    {item.totalPrice.toLocaleString()}원
                  </span>
                  {/* 수량 조작계 */}
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5">
                    <button
                      onClick={() => handleQtyChange(item.cartItemId, item.quantity, -1)}
                      className="w-5 h-5 text-gray-500 font-bold focus:outline-none flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-gray-800 min-w-[12px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQtyChange(item.cartItemId, item.quantity, 1)}
                      className="w-5 h-5 text-gray-500 font-bold focus:outline-none flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 결제액 요약 및 버튼 (shrink-0 하단 영역) */}
      <div
        className="z-30 shrink-0 space-y-2.5 border-t border-gray-100 bg-white px-4 pt-3 shadow-lg"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-500">총 주문 금액</span>
          <span className="text-lg font-bold text-gray-900">{cartTotal.toLocaleString()}원</span>
        </div>

        <button
          onClick={() => navigate("/user/checkout")}
          className="w-full cursor-pointer rounded-xl bg-black py-3.5 text-base font-bold text-white transition-colors hover:bg-gray-900"
        >
          주문하기
        </button>
      </div>
    </div>
  );
};

export default CartPage;
