/**
 * 메뉴/주문/영수증 옵션의 공통 그룹 정렬 순위.
 * SIZE → TOPPING_ADD → TOPPING_REMOVE (그 외는 뒤).
 */
export const OPTION_GROUP_ORDER: Record<string, number> = {
  SIZE: 0,
  TOPPING_ADD: 1,
  TOPPING_REMOVE: 2,
};

/** 유저 바텀시트 토핑 추가 표시 순서. */
export const TOPPING_ADD_DISPLAY_ORDER = [
  "계란후라이",
  "밥 추가",
  "삼겹소금 추가",
  "삼겹양념 추가",
  "참치마요 추가",
  "모짜렐라치즈",
  "체다치즈",
  "스팸",
] as const;

const TOPPING_ADD_RANK = new Map<string, number>(
  TOPPING_ADD_DISPLAY_ORDER.map((name, index) => [name, index]),
);

const HIDDEN_TOPPING_ADD_NAMES = new Set(["고기 추가"]);

/** groupType → 정렬 순위. 미지정/알 수 없는 값은 99. */
export function optionGroupRank(groupType: string | null | undefined): number {
  return OPTION_GROUP_ORDER[groupType ?? ""] ?? 99;
}

export function isHiddenToppingAdd(name: string): boolean {
  return HIDDEN_TOPPING_ADD_NAMES.has(name.trim());
}

export function toppingAddDisplayRank(name: string): number {
  return TOPPING_ADD_RANK.get(name.trim()) ?? 1000;
}
