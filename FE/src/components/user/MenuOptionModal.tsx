import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { MenuDetail, MenuOption } from "../../types/user";
import type { SavedMenuResponse } from "../../types/api";
import { isHiddenToppingAdd, packagingDisplayRank, toppingAddDisplayRank } from "../../utils/optionSort";
import { savedMenuService } from "../../services/user/savedMenuService";
import { getLatestMatchingSavedMenu, isCombinationSaved, toOptionQuantities } from "../../utils/savedMenuCombo";
import { ApiError } from "../../api/client";
import {
  trackOptionSelected,
  trackSavedMenuCreated,
  trackSavedMenuDeleted,
} from "../../utils/userEvent/eventHelpers";
import { SaveMenuPopup } from "./SaveMenuPopup";
import { HorizontalScrollHintRow } from "./HorizontalScrollHintRow";
import { USER_PRIMARY_BUTTON_COLOR, userPrimaryButtonClassName } from "./userPrimaryButton";

interface MenuOptionModalProps {
  menuDetail: MenuDetail;
  mode?: "cart" | "retune";
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
  mode = "cart",
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [savedMenus, setSavedMenus] = useState<SavedMenuResponse[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [saveDeleting, setSaveDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SIZE 그룹 중 기본 선택값 찾기
  const sizeOptions = menuDetail.options.filter((o) => o.groupType === "SIZE");
  const initialSizeId = sizeOptions.find((o) => o.defaultSelected)?.id || sizeOptions[0]?.id;
  const [selectedSizeId, setSelectedSizeId] = useState<number | undefined>(initialSizeId);

  const packagingOptions = menuDetail.options.filter((o) => o.groupType === "PACKAGING");
  const initialPackagingId =
    packagingOptions.find((o) => o.defaultSelected)?.id
    || packagingOptions.find((o) => o.name === "매장")?.id
    || packagingOptions[0]?.id;
  const [selectedPackagingId, setSelectedPackagingId] = useState<number | undefined>(initialPackagingId);

  // TOPPING_ADD 및 TOPPING_REMOVE, null 옵션들에 대한 수량/선택 상태 관리 (평면 구조 유지)
  // '고기 추가'는 더 이상 판매하지 않아 표시·선택 대상에서 제외한다.
  const otherOptions = menuDetail.options.filter(
    (o) =>
      o.groupType !== "SIZE"
      && o.groupType !== "PACKAGING"
      && !(o.groupType === "TOPPING_ADD" && isHiddenToppingAdd(o.name)),
  );
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

  useEffect(() => {
    if (mode !== "cart") return;
    let cancelled = false;
    void savedMenuService
      .list()
      .then((menus) => {
        if (!cancelled) setSavedMenus(menus);
      })
      .catch(() => {
        if (!cancelled) setSavedMenus([]);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, menuDetail.id]);

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
    const option = sizeOptions.find((o) => o.id === id);
    if (option) trackOptionSelected(menuDetail.id, option);
  };

  const handlePackagingChange = (id: number) => {
    setSelectedPackagingId(id);
    const option = packagingOptions.find((o) => o.id === id);
    if (option) trackOptionSelected(menuDetail.id, option);
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
        trackOptionSelected(menuDetail.id, option, 1);
      }
    } else {
      setSelectedOtherOptions((prev) => {
        const next = { ...prev };
        if (currentQty > 0) {
          delete next[option.id];
        } else {
          next[option.id] = 1;
          trackOptionSelected(menuDetail.id, option, 1);
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
      if (val > 0) {
        trackOptionSelected(menuDetail.id, option, nextQty);
      }
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

    if (selectedPackagingId !== undefined) {
      const packagingOpt = packagingOptions.find((o) => o.id === selectedPackagingId);
      if (packagingOpt) {
        price += packagingOpt.additionalPrice;
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

  const collectSelectedOptions = (): MenuOption[] => {
    const finalOptions: MenuOption[] = [];
    if (selectedSizeId !== undefined) {
      const sizeOpt = sizeOptions.find((o) => o.id === selectedSizeId);
      if (sizeOpt) finalOptions.push(sizeOpt);
    }
    if (selectedPackagingId !== undefined) {
      const packagingOpt = packagingOptions.find((o) => o.id === selectedPackagingId);
      if (packagingOpt) finalOptions.push(packagingOpt);
    }
    otherOptions.forEach((opt) => {
      const qty = selectedOtherOptions[opt.id] || 0;
      if (qty > 0) {
        for (let i = 0; i < qty; i++) {
          finalOptions.push(opt);
        }
      }
    });
    return finalOptions;
  };

  const handleSubmit = () => {
    if (isClosing) return;
    const finalOptions = collectSelectedOptions();
    if (mode === "retune") {
      onAddToCart(finalOptions, 1);
      return;
    }

    // 닫힘 애니메이션 후 담기 — 부모 onAddToCart가 모달을 언마운트함
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      onAddToCart(finalOptions, quantity);
    }, 300);
  };

  const selectedForSave = collectSelectedOptions();
  const combinationSaved = isCombinationSaved(menuDetail.id, selectedForSave, savedMenus);
  const heartBusy = saveSubmitting || saveDeleting;

  const handleHeartClick = () => {
    if (isClosing || heartBusy) return;

    if (combinationSaved) {
      const target = getLatestMatchingSavedMenu(menuDetail.id, selectedForSave, savedMenus);
      if (!target) return;

      void (async () => {
        setSaveDeleting(true);
        try {
          await savedMenuService.remove(target.id);
          trackSavedMenuDeleted(target.id);
          setSavedMenus((prev) => prev.filter((item) => item.id !== target.id));
        } catch (err) {
          alert(
            err instanceof ApiError && err.message
              ? err.message
              : "나만의 메뉴 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.",
          );
        } finally {
          setSaveDeleting(false);
        }
      })();
      return;
    }

    setSaveError(null);
    setSaveOpen(true);
  };

  const handleSaveSubmit = async (customName: string) => {
    setSaveSubmitting(true);
    setSaveError(null);
    try {
      const created = await savedMenuService.create({
        menuId: menuDetail.id,
        customName,
        options: toOptionQuantities(selectedForSave),
      });
      trackSavedMenuCreated(created.id, menuDetail.id);
      setSavedMenus((prev) => [created, ...prev]);
      setSaveOpen(false);
    } catch (err) {
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : "나만의 메뉴 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.";
      setSaveError(message);
    } finally {
      setSaveSubmitting(false);
    }
  };

  const toppingAddOptions = otherOptions
    .filter((o) => o.groupType === "TOPPING_ADD")
    .slice()
    .sort((a, b) => {
      const rankDiff = toppingAddDisplayRank(a.name) - toppingAddDisplayRank(b.name);
      if (rankDiff !== 0) return rankDiff;
      return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });
  const toppingRemoveOptions = otherOptions.filter((o) => o.groupType === "TOPPING_REMOVE");
  const extraOptions = otherOptions.filter((o) => o.groupType === null);

  /** 마요 계열 REMOVE(단무지/김가루) — API 옵션명으로만 판별, 메뉴명 규칙 없음 */
  const useWideToppingRemoveLayout = toppingRemoveOptions.some((o) => o.name === "단무지 제외");
  /** SIZE+ADD+REMOVE+PACKAGING 4섹션 — 김치삼겹볶음밥+냉모밀(REMOVE 없음)은 제외 */
  const useTallOptionSheet =
    sizeOptions.length > 0
    && toppingAddOptions.length > 0
    && toppingRemoveOptions.length > 0
    && packagingOptions.length > 0;

  const modal = (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end">
      {/* 오버레이 — 시트와 분리해 닫힐 때 페이드 (시트 슬라이드가 가려지지 않도록) */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-[280ms] ${
          isClosing ? "opacity-0" : "animate-fade-in"
        }`}
        onClick={() => {
          if (!saveOpen) requestClose();
        }}
        aria-hidden
      />

      {/* 바텀시트 — 사이즈·토핑추가·토핑제외가 한 화면에 보이도록 높게 */}
      <div
        className={`relative z-[1] bg-[#F8F9FA] rounded-t-[32px] flex flex-col overflow-hidden shadow-2xl border-t border-gray-100 ${
          useTallOptionSheet ? "max-h-[98%]" : "max-h-[94%]"
        } ${isClosing ? "animate-sheet-out" : "animate-sheet-in"}`}
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
        <div
          className={`overflow-hidden px-6 py-3 ${useTallOptionSheet ? "space-y-2.5" : "space-y-3"}`}
        >
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
              <div className="flex flex-nowrap gap-2">
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
              <h3 className="mb-0 text-xs font-bold uppercase tracking-wider text-gray-500">토핑 추가</h3>
              <HorizontalScrollHintRow
                measureKey={`${menuDetail.id}-add-${toppingAddOptions.length}`}
              >
                <div className="flex w-max gap-2">
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
              </HorizontalScrollHintRow>
            </div>
          )}

          {/* 3) 토핑 제외 (TOPPING_REMOVE) — 마요(2개): PACKAGING과 동일 flex-1 / 그 외: 고정폭 스크롤 */}
          {toppingRemoveOptions.length > 0 && (
            <div>
              <h3
                className={`${
                  useWideToppingRemoveLayout ? "mb-2" : "mb-0"
                } text-xs font-bold uppercase tracking-wider text-gray-500`}
              >
                토핑 제외
              </h3>
              {useWideToppingRemoveLayout ? (
                <div className="flex flex-nowrap gap-2">
                  {[...toppingRemoveOptions]
                    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                    .map((opt) => {
                      const isSelected = !!selectedOtherOptions[opt.id];
                      const removeLabel =
                        opt.name === "고추장소스 제외" ? "고추장 소스 제외" : opt.name;
                      const nameClass = removeLabel.length <= 6 ? "text-[11px]" : "text-[10px]";
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleOtherOptionToggle(opt)}
                          className={`relative flex h-[56px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border bg-white px-1.5 py-1 text-center transition-all ${
                            isSelected ? "border-black text-black" : "border-gray-200 text-gray-400"
                          }`}
                        >
                          <div className={`w-full text-center font-semibold leading-snug ${nameClass}`}>
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
              ) : (
                <HorizontalScrollHintRow
                  measureKey={`${menuDetail.id}-remove-${toppingRemoveOptions.length}`}
                >
                  <div className="flex w-max gap-2">
                    {[...toppingRemoveOptions]
                      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                      .map((opt) => {
                        const isSelected = !!selectedOtherOptions[opt.id];
                        const removeLabel =
                          opt.name === "고추장소스 제외" ? "고추장 소스 제외" : opt.name;
                        const nameClass = removeLabel.length <= 6 ? "text-[11px]" : "text-[10px]";
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleOtherOptionToggle(opt)}
                            className={`relative flex h-[56px] w-[108px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border bg-white px-1.5 py-1 text-center transition-all ${
                              isSelected ? "border-black text-black" : "border-gray-200 text-gray-400"
                            }`}
                          >
                            <div className={`w-full truncate text-center font-semibold leading-snug ${nameClass}`}>
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
                </HorizontalScrollHintRow>
              )}
            </div>
          )}

          {/* 4) 포장 여부 (PACKAGING) - 사이즈와 동일한 1줄 선택, 가격 미표시 */}
          {packagingOptions.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">포장 여부</h3>
              <div className="flex flex-nowrap gap-2">
                {[...packagingOptions]
                  .sort((a, b) => {
                    const rankDiff = packagingDisplayRank(a.name) - packagingDisplayRank(b.name);
                    if (rankDiff !== 0) return rankDiff;
                    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
                  })
                  .map((opt) => {
                    const isSelected = selectedPackagingId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handlePackagingChange(opt.id)}
                        className={`relative flex h-[56px] min-w-0 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border bg-white px-1.5 py-1 text-center transition-all ${
                          isSelected ? "border-black text-black" : "border-gray-200 text-gray-400"
                        }`}
                      >
                        <div className="w-full text-center text-[11px] font-semibold leading-snug">
                          {opt.name}
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

          {/* 5) 기타 옵션 (groupType === null) */}
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
            className="mt-1 h-6 flex items-center justify-center"
            role="status"
            aria-live="polite"
          >
            {warningMessage ? (
              <span className="text-red-500 text-[11px] font-bold animate-fade-in bg-red-50 px-3 py-1 rounded-full border border-red-100">
                {warningMessage}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-6">
            {mode === "cart" && (
              <button
                type="button"
                onClick={handleHeartClick}
                disabled={heartBusy}
                aria-label={
                  combinationSaved ? "나만의 메뉴에서 제거" : "나만의 메뉴로 등록"
                }
                className="flex h-12 w-10 shrink-0 items-center justify-center cursor-pointer focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {combinationSaved ? (
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill={USER_PRIMARY_BUTTON_COLOR}
                    aria-hidden
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6 text-gray-900"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    />
                  </svg>
                )}
              </button>
            )}
            <button
              onClick={handleSubmit}
              className={`${mode === "cart" ? "min-w-0 flex-1" : "w-full"} cursor-pointer rounded-xl py-3.5 text-center text-sm font-bold ${userPrimaryButtonClassName}`}
            >
              {mode === "retune" ? "저장" : `장바구니 담기 · ${totalPrice.toLocaleString()} 원`}
            </button>
          </div>
        </div>
      </div>
      {saveOpen && (
        <SaveMenuPopup
          menuDetail={menuDetail}
          selectedOptions={selectedForSave}
          submitting={saveSubmitting}
          error={saveError}
          onClose={() => {
            if (!saveSubmitting) {
              setSaveOpen(false);
              setSaveError(null);
            }
          }}
          onSubmit={(customName) => void handleSaveSubmit(customName)}
        />
      )}
    </div>
  );

  const frame = document.getElementById("user-app-frame");
  return frame ? createPortal(modal, frame) : modal;
};
