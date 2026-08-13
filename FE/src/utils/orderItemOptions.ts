import type { OrderItemOptionResponse } from "../types/api";
import { optionGroupRank } from "./optionSort";

/** 사이즈 → 토핑 추가 → 토핑 제외 순으로 정렬 */
export function sortOrderItemOptions(
  options: OrderItemOptionResponse[],
): OrderItemOptionResponse[] {
  return [...options].sort((a, b) => {
    const ga = optionGroupRank(a.groupType);
    const gb = optionGroupRank(b.groupType);
    if (ga !== gb) return ga - gb;
    return a.id - b.id;
  });
}

export function formatOrderItemOptionLabels(options: OrderItemOptionResponse[]): string[] {
  return sortOrderItemOptions(options).map((opt) =>
    opt.quantity > 1 ? `${opt.name} x ${opt.quantity}` : opt.name,
  );
}
