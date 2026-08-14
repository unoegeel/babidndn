import type { MenuOption } from "../types/user";
import { optionGroupRank } from "./optionSort";

function displayName(opt: MenuOption): string {
  return opt.name === "기본" ? "싱글" : opt.name.replace(/^\+\s*/, "");
}

/** 사이즈 → 추가 토핑 → 제외 토핑 순, 동일 옵션은 묶어 "싱글 / 계란후라이 x3" 형식 */
export function formatSelectedOptions(options: MenuOption[]): string {
  const sorted = [...options].sort((a, b) => {
    const ga = optionGroupRank(a.groupType);
    const gb = optionGroupRank(b.groupType);
    if (ga !== gb) return ga - gb;
    return a.displayOrder - b.displayOrder || a.id - b.id;
  });

  const counts: Record<string, number> = {};
  const orderList: string[] = [];

  sorted.forEach((opt) => {
    const name = displayName(opt);
    if (!counts[name]) {
      counts[name] = 0;
      orderList.push(name);
    }
    counts[name]++;
  });

  return orderList
    .map((name) => {
      const qty = counts[name];
      return qty > 1 ? `${name}x${qty}` : name;
    })
    .join("/");
}
