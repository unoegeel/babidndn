import type { OrderItemOptionResponse } from "../types/api";
import { optionGroupRank, packagingDisplayRank, toppingAddDisplayRank } from "./optionSort";

/** 사이즈 → 토핑 추가 → 토핑 제외 → 포장 여부 순으로 정렬 */
export function sortOrderItemOptions(
  options: OrderItemOptionResponse[],
): OrderItemOptionResponse[] {
  return [...options].sort((a, b) => {
    const ga = optionGroupRank(a.groupType);
    const gb = optionGroupRank(b.groupType);
    if (ga !== gb) return ga - gb;
    if (a.groupType === "PACKAGING" && b.groupType === "PACKAGING") {
      const rankDiff = packagingDisplayRank(a.name) - packagingDisplayRank(b.name);
      if (rankDiff !== 0) return rankDiff;
    }
    if (a.groupType === "TOPPING_ADD" && b.groupType === "TOPPING_ADD") {
      const rankDiff = toppingAddDisplayRank(a.name) - toppingAddDisplayRank(b.name);
      if (rankDiff !== 0) return rankDiff;
    }
    return a.id - b.id;
  });
}

export function formatOrderItemOptionLabels(options: OrderItemOptionResponse[]): string[] {
  return sortOrderItemOptions(options).map((opt) =>
    opt.quantity > 1 ? `${opt.name} x ${opt.quantity}` : opt.name,
  );
}
