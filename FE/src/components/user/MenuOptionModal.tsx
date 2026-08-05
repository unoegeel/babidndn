import React, { useState, useEffect, useRef } from "react";
import type { MenuDetail, MenuOption } from "../../types/user";

interface MenuOptionModalProps {
  menuDetail: MenuDetail;
  onClose: () => void;
  onAddToCart: (selectedOptions: MenuOption[], quantity: number) => void;
}

export const MenuOptionModal: React.FC<MenuOptionModalProps> = ({
  menuDetail,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SIZE 그룹 중 기본 선택값 찾기
  const sizeOptions = menuDetail.options.filter((o) => o.groupType === "SIZE");
  const initialSizeId = sizeOptions.find((o) => o.defaultSelected)?.id || sizeOptions[0]?.id;
  const [selectedSizeId, setSelectedSizeId] = useState<number | undefined>(initialSizeId);

  // TOPPING_ADD 및 TOPPING_REMOVE, null 옵션들에 대한 수량/선택 상태 관리 (평면 구조 유지)
  const otherOptions = menuDetail.options.filter((o) => o.groupType !== "SIZE");
  const [selectedOtherOptions, setSelectedOtherOptions] = useState<Record<number, number>>(() => {
    const initialSelected: Record<number, number> = {};
    otherOptions.forEach((opt) => {
      if (opt.defaultSelected) {
        initialSelected[opt.id] = 1;
      }
    });
    return initialSelected;
  });

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, []);

  const handleMenuQtyChange = (val: number) => {
    setQuantity((prev) => Math.max(1, prev + val));
  };

  const handleSizeChange = (id: number) => {
    setSelectedSizeId(id);
  };

  // SIZE 및 TOPPING_REMOVE, null 옵션 클릭 처리
  const handleOtherOptionToggle = (option: MenuOption) => {
    const currentQty = selectedOtherOptions[option.id] || 0;
    if (option.groupType === "TOPPING_ADD") {
      if (currentQty > 0) {
        setSelectedOtherOptions((prev) => {
          const next = { ...prev };
          delete next[option.id];
          return next;
        });
      } else {
        setSelectedOtherOptions((prev) => ({
          ...prev,
          [option.id]: 1,
        }));
      }
    } else {
      setSelectedOtherOptions((prev) => {
        const next = { ...prev };
        if (currentQty > 0) {
          delete next[option.id];
        } else {
          next[option.id] = 1;
        }
        return next;
      });
    }
  };

  // TOPPING_ADD 수량 증감 제어
  const handleToppingQtyChange = (option: MenuOption, val: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 토글 차단
    const currentQty = selectedOtherOptions[option.id] || 0;

    // + 클릭 시 maxQuantity 제약 적용
    if (val > 0 && currentQty >= option.maxQuantity) {
      setWarningMessage(`해당 토핑은 최대 ${option.maxQuantity}개까지 선택할 수 있습니다.`);

      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      warningTimeoutRef.current = setTimeout(() => {
        setWarningMessage(null);
      }, 2000);
      return;
    }

    const nextQty = currentQty + val;

    if (nextQty <= 0) {
      setSelectedOtherOptions((prev) => {
        const next = { ...prev };
        delete next[option.id];
        return next;
      });
    } else if (nextQty <= option.maxQuantity) {
      setSelectedOtherOptions((prev) => ({
        ...prev,
        [option.id]: nextQty,
      }));
    }
  };

  // 단품 단가 계산
  const singlePrice = (() => {
    let price = menuDetail.basePrice;

    if (selectedSizeId !== undefined) {
      const sizeOpt = sizeOptions.find((o) => o.id === selectedSizeId);
      if (sizeOpt) {
        price += sizeOpt.additionalPrice;
      }
    }

    otherOptions.forEach((opt) => {
      const qty = selectedOtherOptions[opt.id] || 0;
      if (qty > 0) {
        price += opt.additionalPrice * qty;
      }
    });

    return price;
  })();

  const totalPrice = singlePrice * quantity;

  const handleSubmit = () => {
    const finalOptions: MenuOption[] = [];

    if (selectedSizeId !== undefined) {
      const sizeOpt = sizeOptions.find((o) => o.id === selectedSizeId);
      if (sizeOpt) finalOptions.push(sizeOpt);
    }

    otherOptions.forEach((opt) => {
      const qty = selectedOtherOptions[opt.id] || 0;
      if (qty > 0) {
        for (let i = 0; i < qty; i++) {
          finalOptions.push(opt);
        }
      }
    });

    onAddToCart(finalOptions, quantity);
  };

  const toppingAddOptions = otherOptions.filter((o) => o.groupType === "TOPPING_ADD");
  const toppingRemoveOptions = otherOptions.filter((o) => o.groupType === "TOPPING_REMOVE");
  const extraOptions = otherOptions.filter((o) => o.groupType === null);

  return (
    <div className="absolute inset-0 bg-black/40 z-50 flex flex-col justify-end">
      <div className="flex-1" onClick={onClose}></div>

      {/* 바텀시트 */}
      <div className="bg-[#F8F9FA] rounded-t-[32px] max-h-[85%] flex flex-col overflow-hidden shadow-2xl border-t border-gray-100">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4 bg-white flex justify-between items-start border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{menuDetail.name}</h2>
            <p className="text-sm font-semibold text-gray-800 mt-1">
              {menuDetail.basePrice.toLocaleString()}원
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 cursor-pointer"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 메뉴 설명 */}
          {menuDetail.description && (
            <p className="text-xs text-gray-500 leading-relaxed bg-white p-3.5 rounded-2xl border border-gray-100">
              {menuDetail.description}
            </p>
          )}

          {/* 1) 사이즈 선택 (SIZE) - 토핑 추가와 동일한 1줄 카드 */}
          {sizeOptions.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">사이즈 선택</h3>
              <div className="flex gap-2">
                {[...sizeOptions]
                  .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                  .map((opt) => {
                    const isSelected = selectedSizeId === opt.id;
                    const sizeLabel = opt.name === "기본" ? "싱글" : opt.name;
                    const hasSurcharge = opt.additionalPrice > 0;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSizeChange(opt.id)}
                        className={`relative flex h-[56px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border bg-white px-1.5 py-1 text-center transition-all ${
                          hasSurcharge ? "gap-0.5" : ""
                        } ${
                          isSelected ? "border-black text-black" : "border-gray-200 text-gray-400"
                        }`}
                      >
                        <div className="w-full text-center text-[9.5px] font-bold leading-[1.1]">
                          {sizeLabel}
                        </div>
                        {hasSurcharge && (
                          <div className="text-[8px] leading-none text-gray-400">
                            +{opt.additionalPrice.toLocaleString()}원
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white bg-black text-[9px] font-bold text-white">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 2) 토핑 추가 (TOPPING_ADD) - 1줄 가로 스크롤 */}
          {toppingAddOptions.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">토핑 추가</h3>
              <div className="-mx-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max gap-2 px-1">
                  {toppingAddOptions.map((opt) => {
                    const qty = selectedOtherOptions[opt.id] || 0;
                    const isSelected = qty > 0;
                    const toppingName = opt.name.replace(/^\+\s*/, "");
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleOtherOptionToggle(opt)}
                        className={`relative flex h-[56px] w-[80px] shrink-0 cursor-pointer flex-col items-center justify-between rounded-xl border bg-white p-1 text-center transition-all ${
                          isSelected ? "border-black text-black" : "border-gray-200 text-gray-400"
                        }`}
                      >
                        {isSelected ? (
                          <div className="flex h-full w-full flex-col items-center justify-between">
                            <div className="flex w-full items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-1 py-0.5">
                              <button
                                onClick={(e) => handleToppingQtyChange(opt, -1, e)}
                                className="flex h-3 w-3 cursor-pointer items-center justify-center rounded text-[9px] font-bold leading-none text-gray-500 hover:bg-gray-200 focus:outline-none"
                              >
                                -
                              </button>
                              <span className="min-w-[6px] text-center text-[9px] font-bold text-gray-700">{qty}</span>
                              <button
                                onClick={(e) => handleToppingQtyChange(opt, 1, e)}
                                className="flex h-3 w-3 cursor-pointer items-center justify-center rounded text-[9px] font-bold leading-none text-gray-500 hover:bg-gray-200 focus:outline-none"
                              >
                                +
                              </button>
                            </div>
                            <div className="w-full text-center text-[9px] font-bold leading-[1.1] line-clamp-1">
                              {toppingName}
                            </div>
                            <div className="text-[8px] leading-none text-gray-400">
                              +{opt.additionalPrice.toLocaleString()}원
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
                            <div className="w-full text-center text-[9px] font-bold leading-[1.1] line-clamp-2">
                              {toppingName}
                            </div>
                            <div className="text-[8px] leading-none text-gray-400">
                              +{opt.additionalPrice.toLocaleString()}원
                            </div>
                          </div>
                        )}

                        {isSelected && (
                          <div className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white bg-[#000000] text-[9px] font-bold text-white">
                            {qty}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3) 토핑 제외 (TOPPING_REMOVE) - 사이즈/토핑 추가와 동일한 1줄 카드 */}
          {toppingRemoveOptions.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">토핑 제외</h3>
              <div className="flex gap-2">
                {[...toppingRemoveOptions]
                  .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                  .map((opt) => {
                    const isSelected = !!selectedOtherOptions[opt.id];
                    const removeLabel =
                      opt.name === "고추장소스 제외" ? "고추장 소스 제외" : opt.name;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleOtherOptionToggle(opt)}
                        className={`relative flex h-[56px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border bg-white px-1.5 py-1 text-center transition-all ${
                          isSelected ? "border-black text-black" : "border-gray-200 text-gray-400"
                        }`}
                      >
                        <div className="w-full text-center text-[9.5px] font-bold leading-[1.1] line-clamp-2">
                          {removeLabel}
                        </div>
                        {isSelected && (
                          <div className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white bg-black text-[9px] font-bold text-white">
                            ✓
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 4) 기타 옵션 (groupType === null) */}
          {extraOptions.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">기타 선택</h3>
              <div className="flex gap-2">
                {extraOptions.map((opt) => {
                  const isSelected = !!selectedOtherOptions[opt.id];
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleOtherOptionToggle(opt)}
                      className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all border relative cursor-pointer bg-white ${
                        isSelected
                          ? "border-black text-black"
                          : "border-gray-200 text-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      {opt.name}
                      {opt.additionalPrice > 0 && ` (+${opt.additionalPrice.toLocaleString()}원)`}
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full w-[18px] h-[18px] flex items-center justify-center border border-white text-[9px] font-bold">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">수량</span>
            <div className="flex items-center gap-4 bg-gray-100 rounded-xl px-3.5 py-1.5">
              <button
                onClick={() => handleMenuQtyChange(-1)}
                className="w-5 h-5 text-gray-600 font-bold focus:outline-none flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer text-sm"
              >
                -
              </button>
              <span className="text-xs font-bold text-gray-800 min-w-[16px] text-center">
                {quantity}
              </span>
              <button
                onClick={() => handleMenuQtyChange(1)}
                className="w-5 h-5 text-gray-600 font-bold focus:outline-none flex items-center justify-center hover:bg-gray-200 rounded cursor-pointer text-sm"
              >
                +
              </button>
            </div>
          </div>

          {/* 최대 수량 안내 영역 (고정 공간 확보 및 aria-live/role="status" 설정) */}
          <div
            className="h-7 flex items-center justify-center mt-2.5 mb-1"
            role="status"
            aria-live="polite"
          >
            {warningMessage ? (
              <span className="text-red-500 text-[11px] font-bold animate-fade-in bg-red-50 px-3 py-1 rounded-full border border-red-100">
                {warningMessage}
              </span>
            ) : null}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-black text-white py-4 rounded-xl font-bold text-sm transition-colors hover:bg-gray-900 cursor-pointer text-center"
          >
            장바구니 담기 · {totalPrice.toLocaleString()} 원
          </button>
        </div>
      </div>
    </div>
  );
};
