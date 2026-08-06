import type { OrderItemOptionResponse } from "../types/api";

const GROUP_ORDER: Record<string, number> = {
  SIZE: 0,
  TOPPING_ADD: 1,
  TOPPING_REMOVE: 2,
};

/** 사이즈 → 토핑 추가 → 토핑 제외 순으로 정렬 */
export function sortOrderItemOptions(
  options: OrderItemOptionResponse[],
): OrderItemOptionResponse[] {
  return [...options].sort((a, b) => {
    const ga = GROUP_ORDER[a.groupType ?? ""] ?? 99;
    const gb = GROUP_ORDER[b.groupType ?? ""] ?? 99;
    if (ga !== gb) return ga - gb;
    return a.id - b.id;
  });
}

export function formatOrderItemOptionLabels(options: OrderItemOptionResponse[]): string[] {
  return sortOrderItemOptions(options).map((opt) =>
    opt.quantity > 1 ? `${opt.name} x ${opt.quantity}` : opt.name,
  );
}
