import React, { useState, useEffect, useRef } from "react";
import type { MenuDetail, MenuOption } from "../../types/user";

interface MenuOptionModalProps {
  menuDetail: MenuDetail;
  onClose: () => void;
  onAddToCart: (selectedOptions: MenuOption[], quantity: number) => void;
}

/** 토핑 추가명: 길이에 따라 11/10/9px. 선택 시 -/+ 로 폭이 좁아지면 한 단계 더 작게. */
function toppingNameFontClass(name: string, withQtyControls: boolean): string {
  const len = name.length;
  if (withQtyControls) {
    if (len <= 4) return "text-[11px]";
    if (len <= 6) return "text-[10px]";
    return "text-[9px]";
  }
  if (len <= 5) return "text-[11px]";
  if (len <= 8) return "text-[10px]";
  return "text-[9px]";
}

export const MenuOptionModal: React.FC<MenuOptionModalProps> = ({
  menuDetail,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const requestClose = (afterClose?: () => void) => {
    if (isClosing) return;
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    // sheet-out(0.28s) 종료 후 언마운트 — 애니메이션이 잘리지 않도록 여유 포함
    closeTimerRef.current = setTimeout(() => {
      afterClose?.();
      onClose();
    }, 300);
  };

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
    if (isClosing) return;
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

    // 닫힘 애니메이션 후 담기 — 부모 onAddToCart가 모달을 언마운트함
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      onAddToCart(finalOptions, quantity);
    }, 300);
  };

  const toppingAddOptions = otherOptions.filter((o) => o.groupType === "TOPPING_ADD");
  const toppingRemoveOptions = otherOptions.filter((o) => o.groupType === "TOPPING_REMOVE");
  const extraOptions = otherOptions.filter((o) => o.groupType === null);

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end">
      {/* 오버레이 — 시트와 분리해 닫힐 때 페이드 (시트 슬라이드가 가려지지 않도록) */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-[280ms] ${
          isClosing ? "opacity-0" : "animate-fade-in"
        }`}
        onClick={() => requestClose()}
        aria-hidden
      />

      {/* 바텀시트 — 사이즈·토핑추가·토핑제외가 한 화면에 보이도록 높게 */}
      <div
        className={`relative z-[1] bg-[#F8F9FA] rounded-t-[32px] max-h-[94%] flex flex-col overflow-hidden shadow-2xl border-t border-gray-100 ${
          isClosing ? "animate-sheet-out" : "animate-sheet-in"
        }`}
      >
        {/* 헤더 */}
        <div className="px-6 pt-4 pb-2.5 bg-white flex justify-between items-start border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{menuDetail.name}</h2>
            <p className="text-sm font-medium text-gray-800 mt-0.5 leading-snug">
              {menuDetail.basePrice.toLocaleString()}원
            </p>
          </div>
          <button
            onClick={() => requestClose()}
            className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 cursor-pointer"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 바디 — 세로 스크롤 없이 한 화면에 맞춤 */}
        <div className="overflow-hidden px-6 py-3 space-y-3">
          {/* 메뉴 설명 */}
          {menuDetail.description && (
            <p className="line-clamp-2 text-[11px] text-gray-500 leading-snug bg-white px-3 py-2 rounded-xl border border-gray-100">
              {menuDetail.description}
            </p>
          )}

          {/* 1) 사이즈 선택 (SIZE) - 토핑 추가와 동일한 1줄 카드 */}
          {sizeOptions.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">사이즈 선택</h3>
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
                        <div className="w-full text-center text-[11px] font-semibold leading-snug">
                          {sizeLabel}
                        </div>
                        {hasSurcharge && (
                          <div className="text-[10px] leading-snug text-gray-400">
                            +{opt.additionalPrice.toLocaleString()}원
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white bg-black text-[10px] font-bold text-white">
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
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">토핑 추가</h3>
              {/* overflow-x-auto는 세로도 clip → 배지(-top/-right 1.5 = 6px)보다 큰 padding으로 잘림 방지 */}
              <div className="-mx-1 overflow-x-auto px-1.5 pb-1.5 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max gap-2 px-1.5">
                  {toppingAddOptions.map((opt) => {
                    const qty = selectedOtherOptions[opt.id] || 0;
                    const isSelected = qty > 0;
                    const toppingName = opt.name.replace(/^\+\s*/, "");
                    const nameClass = toppingNameFontClass(toppingName, isSelected);
                    return (
                      <div
                        key={opt.id}
                        onClick={
                          isSelected
                            ? undefined
                            : () => handleOtherOptionToggle(opt)
                        }
                        className={`relative flex h-[56px] w-[108px] shrink-0 flex-col items-center justify-center rounded-xl border bg-white px-1.5 py-1 text-center transition-all ${
                          isSelected
                            ? "border-black text-black"
                            : "cursor-pointer border-gray-200 text-gray-400"
                        }`}
                      >
                        {isSelected ? (
                          <div className="relative flex h-full w-full flex-col items-center justify-center">
                            {/* 표시용 레이어 — 클릭은 좌/우 히트 영역이 처리 */}
                            <div className="pointer-events-none flex w-full items-center gap-0.5">
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[11px] font-bold leading-none text-gray-500">
                                -
                              </span>
                              <div
                                className={`min-w-0 flex-1 truncate text-center font-semibold leading-snug ${nameClass}`}
                              >
                                {toppingName}
                              </div>
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[11px] font-bold leading-none text-gray-500">
                                +
                              </span>
                            </div>
                            <div className="pointer-events-none mt-0.5 text-[10px] leading-snug text-gray-400">
                              +{opt.additionalPrice.toLocaleString()}원
                            </div>

                            {/* 좌측 절반: 수량 감소 (1개일 때 선택 해제) */}
                            <button
                              type="button"
                              aria-label={`${toppingName} 수량 감소`}
                              onClick={(e) => handleToppingQtyChange(opt, -1, e)}
                              className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer focus:outline-none"
                            />
                            {/* 우측 절반: 수량 증가 */}
                            <button
                              type="button"
                              aria-label={`${toppingName} 수량 증가`}
                              onClick={(e) => handleToppingQtyChange(opt, 1, e)}
                              className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer focus:outline-none"
                            />
                          </div>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center">
                            <div
                              className={`w-full truncate text-center font-semibold leading-snug ${nameClass}`}
                            >
                              {toppingName}
                            </div>
                            <div className="mt-0.5 text-[10px] leading-snug text-gray-400">
                              +{opt.additionalPrice.toLocaleString()}원
                            </div>
                          </div>
                        )}

                        {isSelected && (
                          <div className="pointer-events-none absolute -right-1.5 -top-1.5 z-20 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white bg-[#000000] text-[10px] font-bold text-white">
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
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">토핑 제외</h3>
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
                        <div className="w-full text-center text-[11px] font-semibold leading-snug line-clamp-2">
                          {removeLabel}
                        </div>
                        {isSelected && (
                          <div className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white bg-black text-[10px] font-bold text-white">
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
              <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">기타 선택</h3>
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
                        <div className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full w-[18px] h-[18px] flex items-center justify-center border border-white text-[10px] font-bold">
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
        <div className="px-6 pt-4 pb-5 border-t border-gray-100 bg-white">
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
            className="h-6 flex items-center justify-center mt-2 mb-1"
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
            className="w-full cursor-pointer rounded-xl border border-[#D8B47E] bg-[#D8B47E] py-3.5 text-center text-sm font-bold text-white transition-colors hover:bg-[#C59B62]"
          >
            장바구니 담기 · {totalPrice.toLocaleString()} 원
          </button>
        </div>
      </div>
    </div>
  );
};
