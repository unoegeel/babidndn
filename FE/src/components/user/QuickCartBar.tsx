import { useNavigate } from "react-router-dom";
import { useUserData } from "../../store/UserDataContext";

/** 메뉴·나만의 메뉴 페이지 하단 퀵 장바구니 바 (0개여도 항상 노출) */
export function QuickCartBar() {
  const navigate = useNavigate();
  const { cart, cartTotal } = useUserData();
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className="z-30 shrink-0 border-t border-gray-100 bg-white px-4 pt-3"
      style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="relative bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="absolute -top-1.5 -right-1.5 bg-[#000000] text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
              {totalCartItems}
            </span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium leading-snug">{totalCartItems}개 담김</p>
            <p className="text-sm font-bold text-gray-900 leading-snug">총 {cartTotal.toLocaleString()}원</p>
          </div>
        </div>

        <button
          disabled={totalCartItems === 0}
          onClick={() => totalCartItems > 0 && navigate("/user/cart")}
          className={`py-3 px-6 rounded-xl font-bold text-[13px] transition-all border ${
            totalCartItems === 0
              ? "bg-[#D8B47E]/40 text-[#D8B47E]/60 border-transparent cursor-not-allowed"
              : "bg-[#D8B47E] text-white border-[#D8B47E] hover:bg-[#C59B62] cursor-pointer"
          }`}
        >
          장바구니 보기
        </button>
      </div>
    </div>
  );
}
