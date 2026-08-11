import type { ReceiptOptionLine } from "../types/receipt";

const GROUP_ORDER: Record<string, number> = {
  SIZE: 0,
  TOPPING_ADD: 1,
  TOPPING_REMOVE: 2,
};

/**
 * 영수증 옵션을 사이즈 → 추가 토핑 → 제외 토핑 순으로 정렬.
 * 원본 배열은 변경하지 않는다.
 */
export function sortReceiptOptions(options: ReceiptOptionLine[]): ReceiptOptionLine[] {
  return [...options].sort((a, b) => {
    const ga = GROUP_ORDER[a.groupType ?? ""] ?? 99;
    const gb = GROUP_ORDER[b.groupType ?? ""] ?? 99;
    if (ga !== gb) return ga - gb;
    return 0;
  });
}
