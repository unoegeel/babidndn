import type { MenuOption } from "../types/user";
import type { SavedMenuOptionResponse, SavedMenuResponse } from "../types/api";

export interface OptionQuantity {
  menuOptionId: number;
  quantity: number;
}

export function toOptionQuantities(options: MenuOption[]): OptionQuantity[] {
  const counts = new Map<number, number>();
  options.forEach((option) => {
    counts.set(option.id, (counts.get(option.id) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([menuOptionId, quantity]) => ({ menuOptionId, quantity }));
}

export function savedMenuComboKey(menuId: number, options: OptionQuantity[]): string {
  const normalized = [...options]
    .filter((option) => option.menuOptionId > 0 && option.quantity > 0)
    .sort((a, b) => a.menuOptionId - b.menuOptionId)
    .map((option) => `${option.menuOptionId}:${option.quantity}`)
    .join(",");
  return `${menuId}|${normalized}`;
}

export function comboKeyFromMenuOptions(menuId: number, options: MenuOption[]): string {
  return savedMenuComboKey(menuId, toOptionQuantities(options));
}

export function comboKeyFromSavedOptions(
  menuId: number | null,
  options: SavedMenuOptionResponse[],
): string | null {
  if (menuId == null) return null;
  return savedMenuComboKey(
    menuId,
    options
      .filter((option) => option.menuOptionId != null)
      .map((option) => ({
        menuOptionId: option.menuOptionId as number,
        quantity: option.quantity,
      })),
  );
}

export function findMatchingSavedMenus(
  menuId: number,
  selectedOptions: MenuOption[],
  savedMenus: SavedMenuResponse[],
): SavedMenuResponse[] {
  const current = comboKeyFromMenuOptions(menuId, selectedOptions);
  return savedMenus.filter(
    (saved) => comboKeyFromSavedOptions(saved.menuId, saved.options) === current,
  );
}

/** GET 목록이 createdAt desc 이므로 첫 항목이 가장 최근 등록분이다. */
export function getLatestMatchingSavedMenu(
  menuId: number,
  selectedOptions: MenuOption[],
  savedMenus: SavedMenuResponse[],
): SavedMenuResponse | null {
  return findMatchingSavedMenus(menuId, selectedOptions, savedMenus)[0] ?? null;
}

export function isCombinationSaved(
  menuId: number,
  selectedOptions: MenuOption[],
  savedMenus: SavedMenuResponse[],
): boolean {
  return findMatchingSavedMenus(menuId, selectedOptions, savedMenus).length > 0;
}

export function savedOptionsToRequest(
  options: SavedMenuOptionResponse[],
): OptionQuantity[] {
  return options
    .filter((option) => option.menuOptionId != null)
    .map((option) => ({
      menuOptionId: option.menuOptionId as number,
      quantity: option.quantity,
    }));
}
