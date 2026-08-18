type UserDrawerProps = {
  isOpen: boolean;
  isClosing: boolean;
  cartItemCount: number;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onRequestNotification: () => void;
  onOpenBusinessInfo: () => void;
};

export function UserDrawer({
  isOpen,
  isClosing,
  cartItemCount,
  onClose,
  onNavigate,
  onRequestNotification,
  onOpenBusinessInfo,
}: UserDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex">
      {/* 오버레이 클릭 시 닫기 */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-[240ms] ${
          isClosing ? "opacity-0" : "animate-fade-in"
        }`}
        onClick={onClose}
      ></div>

      {/* 단순한 흰색 패널 */}
      <aside
        className={`absolute inset-y-0 left-0 bg-white w-64 shadow-2xl flex flex-col p-5 z-50 border-r border-gray-100 ${
          isClosing ? "animate-slide-left-out" : "animate-slide-right"
        }`}
      >
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <span className="text-base font-bold text-gray-900">바비든든</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 cursor-pointer"
            aria-label="메뉴 닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => onNavigate("/user")}
            className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            메뉴 보기
          </button>
          <button
            onClick={() => onNavigate("/user/cart")}
            className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            장바구니
            {cartItemCount > 0 && (
              <span className="ml-2 text-[11px] font-semibold text-[#C59B62]">{cartItemCount}</span>
            )}
          </button>
          <button
            onClick={() => onNavigate("/user/orders")}
            className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            최근 주문 내역
          </button>
          <button
            onClick={() => onNavigate("/user/notices")}
            className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            공지사항
          </button>
          <button
            onClick={() => onNavigate("/user/reviews")}
            className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            리뷰
          </button>
          <button
            onClick={() => onNavigate("/user/guide")}
            className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer border-t border-gray-100 mt-4 pt-4"
          >
            사용 가이드
          </button>
          <button
            onClick={onRequestNotification}
            className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            브라우저 알림 설정
          </button>
        </nav>

        <div className="mt-auto shrink-0 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => onNavigate("/user/refund-policy")}
            className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            환불 정책
          </button>
          <button
            type="button"
            onClick={() => onNavigate("/user/contact")}
            className="w-full text-left py-3 px-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            서비스 문의하기 →
          </button>
          <button
            type="button"
            onClick={onOpenBusinessInfo}
            aria-label="사업장 정보"
            className="w-full text-left py-3 px-2 rounded-xl text-[11px] font-bold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            바비오더
          </button>
          <p className="mt-0.5 px-2 text-[10px] text-gray-400">(C) 2026 BabiOrder</p>
        </div>
      </aside>
    </div>
  );
}
