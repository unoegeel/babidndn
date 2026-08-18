type UserHeaderProps = {
  title: string;
  isMenuPage: boolean;
  isStatusPage: boolean;
  isCartPage: boolean;
  unreadCount: number;
  cartItemCount: number;
  onOpenDrawer: () => void;
  onOpenMyMenu: () => void;
  onToggleNotifications: () => void;
  onBack: () => void;
  onHome: () => void;
  onMenuTitleClick: () => void;
};

export function UserHeader({
  title,
  isMenuPage,
  isStatusPage,
  isCartPage,
  unreadCount,
  cartItemCount,
  onOpenDrawer,
  onOpenMyMenu,
  onToggleNotifications,
  onBack,
  onHome,
  onMenuTitleClick,
}: UserHeaderProps) {
  return (
    <header className="h-14 border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 bg-white z-50 shrink-0">
      {/* 왼쪽 영역 */}
      <div className="w-10 flex items-center">
        {isMenuPage ? (
          // 햄버거 메뉴 아이콘
          <button
            onClick={onOpenDrawer}
            className="text-gray-700 focus:outline-none p-1 cursor-pointer"
            aria-label="메뉴"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        ) : (
          // 뒤로가기 버튼
          <button
            onClick={onBack}
            className="text-gray-700 focus:outline-none p-1 cursor-pointer"
            aria-label="뒤로가기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* 타이틀 — 메뉴 페이지의 바비든든 클릭 시 목록 스크롤 최상단 */}
      {isMenuPage ? (
        <button
          type="button"
          onClick={onMenuTitleClick}
          className="flex-1 text-center text-lg font-bold text-gray-800 focus:outline-none cursor-pointer"
          aria-label="메뉴 맨 위로"
        >
          {title}
        </button>
      ) : (
        <h1 className="text-lg font-bold text-gray-800 text-center flex-1">{title}</h1>
      )}

      {/* 오른쪽 영역 */}
      <div className="flex min-w-10 items-center justify-end gap-1">
        {isMenuPage && (
          <>
            <button
              type="button"
              onClick={onOpenMyMenu}
              className="relative p-1 text-gray-700 focus:outline-none cursor-pointer"
              aria-label="나만의 메뉴"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
              </svg>
            </button>
            <button
              onClick={onToggleNotifications}
              className="text-gray-700 relative p-1 focus:outline-none cursor-pointer"
              aria-label="알림"
            >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            {/* 빨간 알림 뱃지 */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </button>
          </>
        )}

        {isStatusPage && (
          // 홈으로 가기 버튼
          <button
            onClick={onHome}
            className="text-gray-700 focus:outline-none p-1 cursor-pointer"
            aria-label="홈"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </button>
        )}

        {isCartPage && cartItemCount > 0 && (
          <div className="w-6 h-6"></div>
        )}
      </div>
    </header>
  );
}
