import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { MenuCategory, MenuDetail, MenuSummary, MenuOption } from "../../types/user";
import { menuService } from "../../services/user/menuService";
import { useUserData } from "../../store/UserDataContext";
import { MenuOptionModal } from "../../components/user/MenuOptionModal";

export const MenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, addToCart } = useUserData();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모달 제어용 상태
  const [activeMenuDetail, setActiveMenuDetail] = useState<MenuDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

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

  // 특정 메뉴 선택 시 상세 조회 및 모달 오픈
  const handleMenuSelect = async (menuId: number) => {
    try {
      setModalLoading(true);
      const detail = await menuService.getMenuDetail(menuId);
      if (detail.saleStatus === "SOLDOUT") {
        alert("품절된 메뉴입니다.");
        return;
      }
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

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
        {categories
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((cat) => {
            const isSelected = cat.categoryId === selectedCategoryId;
            return (
              <button
                key={cat.categoryId}
                onClick={() => setSelectedCategoryId(cat.categoryId)}
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

      {/* 메뉴 카드 목록 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5">
        {sortedMenus.length === 0 ? (
          <div className="py-24 text-center text-gray-400 font-bold text-xs">
            이 카테고리에는 등록된 메뉴가 없습니다.
          </div>
        ) : (
          sortedMenus.map((menu) => {
            const isSoldOut = menu.saleStatus === "SOLDOUT";
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
                {/* 메뉴 사진 (피그마 '사진' 대체 텍스트 구성) */}
                <div className="w-[84px] h-[84px] rounded-xl overflow-hidden bg-[#F8F9FA] border border-gray-100 flex-shrink-0 flex items-center justify-center relative">
                  <span className="text-gray-400 font-bold text-xs">사진</span>
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-xs font-extrabold">품절</span>
                    </div>
                  )}
                </div>

                {/* 메뉴 정보 */}
                <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 truncate">{menu.name}</h3>
                    {menu.description && (
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {menu.description}
                      </p>
                    )}
                  </div>
                  <p className="text-xs font-black text-gray-900 mt-2">
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

      {/* 하단 퀵 장바구니 바 (장바구니 0개여도 항상 노출, shrink-0 하단 영역) */}
      <div
        className="shrink-0 p-4 bg-white border-t border-gray-100 z-30"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -top-1.5 -right-1.5 bg-[#000000] text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                {totalCartItems}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold">{totalCartItems}개 담김</p>
              <p className="text-sm font-black text-gray-900">총 {cartTotal.toLocaleString()}원</p>
            </div>
          </div>

          <button
            disabled={totalCartItems === 0}
            onClick={() => totalCartItems > 0 && navigate("/user/cart")}
            className={`py-3 px-6 rounded-xl font-bold text-xs transition-all border ${
              totalCartItems === 0
                ? "bg-[#D8B47E]/40 text-[#D8B47E]/60 border-transparent cursor-not-allowed"
                : "bg-[#D8B47E] text-white border-[#D8B47E] hover:bg-[#C59B62] cursor-pointer"
            }`}
          >
            결제하기
          </button>
        </div>
      </div>

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
