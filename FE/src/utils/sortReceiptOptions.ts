import type { ReceiptOptionLine } from "../types/receipt";
import { optionGroupRank, packagingDisplayRank, toppingAddDisplayRank } from "./optionSort";

/**
 * 영수증 옵션을 사이즈 → 포장 여부 → 추가 토핑 → 제외 토핑 순으로 정렬.
 * 원본 배열은 변경하지 않는다.
 */
export function sortReceiptOptions(options: ReceiptOptionLine[]): ReceiptOptionLine[] {
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
    return 0;
  });
}
