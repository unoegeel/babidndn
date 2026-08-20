import React, { useState, useEffect, useRef, useCallback } from "react";
import type { MenuCategory, MenuDetail, MenuSummary, MenuOption, MenuBadge } from "../../types/user";
import { menuService } from "../../services/user/menuService";
import { useUserData } from "../../store/UserDataContext";
import { MenuOptionModal } from "../../components/user/MenuOptionModal";
import MenuThumb from "../../components/user/MenuThumb";
import MarqueeText from "../../components/user/MarqueeText";
import { WaitingStatusBar } from "../../components/user/WaitingStatusBar";
import { QuickCartBar } from "../../components/user/QuickCartBar";
import { enablesOptionSheet } from "../../utils/optionSort";
import {
  trackAddToCart,
  trackMenuOptionOpen,
  trackMenuView,
} from "../../utils/userEvent/eventHelpers";

const SWIPE_THRESHOLD_PX = 56;

const NO_TAKEOUT_KEYWORDS = ["바비우동", "김치우동"] as const;

const isNoTakeoutMenu = (menuName: string) =>
  NO_TAKEOUT_KEYWORDS.some((keyword) => menuName.includes(keyword));

const MENU_BADGE_LABELS: Record<MenuBadge, string> = {
  NONE: "",
  POPULAR: "인기",
  BEST: "NEW",
  RECOMMENDED: "추천",
};

const MENU_BADGE_CLASS: Record<Exclude<MenuBadge, "NONE">, string> = {
  POPULAR: "border-[#D8B47E] bg-[#D8B47E] text-white",
  BEST: "border-black bg-black text-white",
  RECOMMENDED: "border-green-600 bg-green-600 text-white",
};

export const MenuPage: React.FC = () => {
  const { addToCart, cart } = useUserData();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모달 제어용 상태
  const [activeMenuDetail, setActiveMenuDetail] = useState<MenuDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const menuListRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeLockedRef = useRef(false);
  const [categorySlideClass, setCategorySlideClass] = useState("");

  const sortedCategories = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);

  const selectCategory = useCallback(
    (categoryId: number, direction?: "next" | "prev") => {
      if (selectedCategoryId === categoryId) return;

      // 최초 로드(아직 선택 없음)는 슬라이드 없이 바로 표시
      if (selectedCategoryId === null) {
        setCategorySlideClass("");
        setSelectedCategoryId(categoryId);
        return;
      }

      let slideDir = direction;
      if (!slideDir) {
        const fromIdx = sortedCategories.findIndex((c) => c.categoryId === selectedCategoryId);
        const toIdx = sortedCategories.findIndex((c) => c.categoryId === categoryId);
        if (fromIdx >= 0 && toIdx >= 0) {
          slideDir = toIdx > fromIdx ? "next" : "prev";
        }
      }

      setCategorySlideClass(slideDir === "prev" ? "animate-cat-prev" : "animate-cat-next");
      setSelectedCategoryId(categoryId);
    },
    [selectedCategoryId, sortedCategories],
  );

  // 전체 카테고리 로드
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await menuService.getCategories();
        setCategories(data);
        if (data.length > 0) {
          const sorted = [...data].sort((a, b) => a.displayOrder - b.displayOrder);
          setSelectedCategoryId(sorted[0].categoryId);
        }
      } catch (err) {
        console.error(err);
        setError("메뉴 데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // 헤더 "바비든든" 클릭 시 메뉴 목록 스크롤 최상단
  useEffect(() => {
    const handleScrollTop = () => {
      menuListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("user-menu-scroll-top", handleScrollTop);
    return () => window.removeEventListener("user-menu-scroll-top", handleScrollTop);
  }, []);

  // 카테고리 변경 시 목록 스크롤 리셋
  useEffect(() => {
    menuListRef.current?.scrollTo({ top: 0 });
  }, [selectedCategoryId]);

  const switchCategoryByOffset = useCallback(
    (offset: number) => {
      if (sortedCategories.length === 0 || selectedCategoryId === null) return;
      const currentIndex = sortedCategories.findIndex((c) => c.categoryId === selectedCategoryId);
      if (currentIndex < 0) return;
      const nextIndex = currentIndex + offset;
      if (nextIndex < 0 || nextIndex >= sortedCategories.length) return;
      selectCategory(sortedCategories[nextIndex].categoryId, offset > 0 ? "next" : "prev");
    },
    [sortedCategories, selectedCategoryId, selectCategory],
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipeLockedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || swipeLockedRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // 세로 스크롤이 우세하면 스와이프 카테고리 전환 잠금
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
      swipeLockedRef.current = true;
      return;
    }

    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;

    // 손가락을 왼쪽으로 → 다음 카테고리, 오른쪽으로 → 이전 카테고리
    switchCategoryByOffset(dx < 0 ? 1 : -1);
    swipeLockedRef.current = true;
    touchStartRef.current = null;
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    swipeLockedRef.current = false;
  };

  // 특정 메뉴 선택 시 상세 조회 → 토핑 불가면 바로 담기, 가능하면 옵션 시트 오픈
  const handleMenuSelect = async (menuId: number) => {
    const categoryId = selectedCategoryId ?? currentCategory?.categoryId ?? 0;
    trackMenuView(menuId, categoryId);

    try {
      setModalLoading(true);
      const detail = await menuService.getMenuDetail(menuId);
      if (detail.saleStatus === "SOLDOUT") {
        alert("품절된 메뉴입니다.");
        return;
      }

      // 토핑 불가능이거나 시트용 옵션이 없으면 바텀시트 없이 즉시 담기
      const hasOptionSheet = detail.options.some((option) => enablesOptionSheet(option.groupType));
      if (detail.toppingEnabled === false || !hasOptionSheet) {
        const sizeOptions = detail.options.filter((o) => o.groupType === "SIZE");
        const defaultSize =
          sizeOptions.find((o) => o.defaultSelected) ?? sizeOptions[0] ?? null;
        const selectedOptions = defaultSize ? [defaultSize] : [];
        addToCart(detail, selectedOptions, 1);
        trackAddToCart(detail.id, 1, Math.max(1, cart.length + 1));
        return;
      }

      trackMenuOptionOpen(detail.id, detail.categoryId);
      setActiveMenuDetail(detail);
    } catch (err) {
      console.error(err);
      alert("존재하지 않거나 불러올 수 없는 메뉴입니다.");
    } finally {
      setModalLoading(false);
    }
  };

  // 장바구니 담기 완료 콜백
  const handleAddToCartConfirm = (selectedOptions: MenuOption[], qty: number) => {
    if (activeMenuDetail) {
      addToCart(activeMenuDetail, selectedOptions, qty);
      trackAddToCart(activeMenuDetail.id, qty, Math.max(1, cart.length + 1));
      setActiveMenuDetail(null);
    }
  };

  const currentCategory = categories.find((c) => c.categoryId === selectedCategoryId);
  const menusToShow: MenuSummary[] = currentCategory ? currentCategory.menus : [];
  const sortedMenus = [...menusToShow].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.id - b.id;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="text-gray-500 font-semibold text-xs">메뉴판을 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center">
        <svg className="w-10 h-10 text-red-500 mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-gray-800 font-bold text-xs mb-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white relative overflow-hidden h-full">
      {/* 카테고리 가로 스크롤 탭 바 */}
      <div className="shrink-0 bg-white z-10 border-b border-gray-100 overflow-x-auto scrollbar-none flex px-4 gap-2 py-3.5">
        {sortedCategories.map((cat) => {
          const isSelected = cat.categoryId === selectedCategoryId;
          return (
            <button
              key={cat.categoryId}
              onClick={() => selectCategory(cat.categoryId)}
              className={`py-2 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                isSelected
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {cat.categoryName}
            </button>
          );
        })}
      </div>

      <WaitingStatusBar />

      {/* 메뉴 카드 목록 영역 — 좌우 스와이프로 카테고리 전환 */}
      <div
        ref={menuListRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          key={selectedCategoryId ?? "none"}
          className={`space-y-3.5 ${categorySlideClass}`}
        >
          {sortedMenus.length === 0 ? (
            <div className="py-24 text-center text-gray-400 font-bold text-xs">
              이 카테고리에는 등록된 메뉴가 없습니다.
            </div>
          ) : (
            sortedMenus.map((menu) => {
              const isSoldOut = menu.saleStatus === "SOLDOUT";
              const badge = menu.badge ?? "NONE";
              const badgeClass =
                badge !== "NONE" && badge in MENU_BADGE_CLASS
                  ? MENU_BADGE_CLASS[badge as Exclude<MenuBadge, "NONE">]
                  : null;
              return (
                <div
                  key={menu.id}
                  onClick={() => !isSoldOut && handleMenuSelect(menu.id)}
                  className={`flex gap-4 p-4 rounded-2xl border transition-all relative ${
                    isSoldOut
                      ? "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"
                      : "bg-white border-gray-100 hover:border-gray-300 cursor-pointer"
                  }`}
                >
                  {badgeClass && (
                    <span
                      className={`pointer-events-none absolute top-2 left-2 z-10 inline-flex min-h-[2.25rem] min-w-[2.25rem] origin-center items-center justify-center rounded-full border px-2.5 py-2 text-xs font-semibold leading-none whitespace-nowrap rotate-[-10deg] ${badgeClass}`}
                    >
                      {MENU_BADGE_LABELS[badge] ?? badge}
                    </span>
                  )}
                  {isNoTakeoutMenu(menu.name) && (
                    <span className="pointer-events-none absolute top-2 right-2 z-10 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold leading-snug text-red-600 whitespace-nowrap">
                      🚫포장 불가🚫
                    </span>
                  )}
                  {/* 메뉴 사진 */}
                  <div className="relative flex h-[84px] w-[84px] flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-[#F8F9FA]">
                    <MenuThumb src={menu.imageUrl} alt={menu.name} />
                    {isSoldOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-xs font-bold text-white">품절</span>
                      </div>
                    )}
                  </div>

                  {/* 메뉴 정보 */}
                  <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                    <div>
                      <MarqueeText
                        text={menu.name}
                        textClassName="text-sm font-bold text-gray-900 leading-snug"
                      />
                      {menu.description && (
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-normal">
                          {menu.description}
                        </p>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-900 mt-2 leading-snug">
                      {menu.basePrice.toLocaleString()}원
                    </p>
                  </div>

                  {/* 담기 버튼 */}
                  <div className="flex items-end">
                    <button
                      disabled={isSoldOut}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuSelect(menu.id);
                      }}
                      className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSoldOut
                          ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                          : "bg-black text-white hover:bg-gray-800"
                      }`}
                    >
                      담기
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <QuickCartBar />

      {/* 상세 및 옵션 선택 바텀시트 모달 */}
      {activeMenuDetail && (
        <MenuOptionModal
          menuDetail={activeMenuDetail}
          onClose={() => setActiveMenuDetail(null)}
          onAddToCart={handleAddToCartConfirm}
        />
      )}

      {/* 백드롭 로딩 */}
      {modalLoading && (
        <div className="absolute inset-0 bg-white/40 z-50 flex items-center justify-center">
          <div className="text-xs font-bold text-gray-500">옵션을 불러오는 중...</div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
