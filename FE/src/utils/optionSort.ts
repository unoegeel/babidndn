/**
 * 메뉴/주문/영수증 옵션의 공통 그룹 정렬 순위.
 * SIZE → TOPPING_ADD → TOPPING_REMOVE (그 외는 뒤).
 */
export const OPTION_GROUP_ORDER: Record<string, number> = {
  SIZE: 0,
  TOPPING_ADD: 1,
  TOPPING_REMOVE: 2,
};

/** groupType → 정렬 순위. 미지정/알 수 없는 값은 99. */
export function optionGroupRank(groupType: string | null | undefined): number {
  return OPTION_GROUP_ORDER[groupType ?? ""] ?? 99;
}
