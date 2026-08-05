import type { MenuOption } from "../types/user";

/** 동일 옵션을 묶어 "싱글 / 계란후라이 x3" 형식으로 표시 */
export function formatSelectedOptions(options: MenuOption[]): string {
  const counts: Record<string, number> = {};
  const orderList: string[] = [];

  options.forEach((opt) => {
    const name = opt.name === "기본" ? "싱글" : opt.name.replace(/^\+\s*/, "");
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
