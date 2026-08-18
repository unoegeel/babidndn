import type { MenuOption } from "../../types/user";
import type { SavedMenuResponse, SavedMenuStatus } from "../../types/api";
import MenuThumb from "./MenuThumb";
import MarqueeText from "./MarqueeText";
import { formatSelectedOptions } from "../../utils/formatSelectedOptions";

function snapshotToMenuOptions(saved: SavedMenuResponse): MenuOption[] {
  const options: MenuOption[] = [];
  [...saved.options]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .forEach((option) => {
      const mapped: MenuOption = {
        id: option.menuOptionId ?? option.id,
        groupType: (option.groupType as MenuOption["groupType"]) ?? null,
        name: option.name,
        additionalPrice: option.additionalPrice,
        maxQuantity: option.quantity,
        defaultSelected: false,
        displayOrder: option.displayOrder,
      };
      for (let i = 0; i < option.quantity; i += 1) {
        options.push(mapped);
      }
    });
  return options;
}

function statusLabel(status: SavedMenuStatus): string | null {
  switch (status) {
    case "SOLDOUT":
      return "품절";
    case "DISCONTINUED":
      return "판매종료";
    case "OPTIONS_STALE":
      return "토핑 재설정 필요";
    default:
      return null;
  }
}

export function SavedMenuCard({
  saved,
  busy,
  onAdd,
  onOrder,
  onRetune,
  onDelete,
}: {
  saved: SavedMenuResponse;
  busy: boolean;
  onAdd: () => void;
  onOrder: () => void;
  onRetune: () => void;
  onDelete: () => void;
}) {
  const optionText = formatSelectedOptions(snapshotToMenuOptions(saved));
  const badge = statusLabel(saved.status);
  const canOrder = saved.status === "AVAILABLE";
  const canRetune = saved.status === "OPTIONS_STALE";

  return (
    <div className="relative flex gap-4 rounded-2xl border border-gray-100 bg-white p-4">
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="absolute right-3 top-3 z-10 p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer disabled:opacity-50"
        aria-label="삭제"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="relative flex h-[84px] w-[84px] flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-[#F8F9FA]">
        <MenuThumb src={saved.menuImageUrl} alt={saved.menuName} />
        {badge && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="px-1 text-center text-[10px] font-bold leading-snug text-white">{badge}</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between pr-5">
        <div>
          <h3 className="pr-4 text-sm font-bold text-gray-900">
            <MarqueeText text={saved.customName} textClassName="text-sm font-bold text-gray-900" />
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">{saved.menuName}</p>
          {optionText ? (
            <MarqueeText
              text={optionText}
              className="mt-1"
              textClassName="text-xs text-gray-400"
            />
          ) : null}
          {badge && saved.status !== "AVAILABLE" ? (
            <p className="mt-1 text-[11px] font-semibold text-red-500">{badge}</p>
          ) : null}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          {canRetune ? (
            <button
              type="button"
              onClick={onRetune}
              disabled={busy}
              className="rounded-xl border border-black bg-black px-3 py-2 text-[11px] font-bold text-white cursor-pointer disabled:opacity-50"
            >
              토핑 재설정
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onAdd}
                disabled={busy || !canOrder}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                담기
              </button>
              <button
                type="button"
                onClick={onOrder}
                disabled={busy || !canOrder}
                className="rounded-xl border border-[#D8B47E] bg-[#D8B47E] px-3 py-2 text-[11px] font-bold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                주문하기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
