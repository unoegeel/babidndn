import Toggle from "../../Toggle";
import type { Menu } from "../../../types/admin";

export function MenuCard({
  menu,
  selected,
  onEdit,
  onToggleStatus,
}: {
  menu: Menu;
  selected: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      className={`flex w-full cursor-pointer flex-col rounded-[25px] border bg-canvas p-[20px] transition-shadow ${
        selected ? "border-black ring-2 ring-black/40" : "border-black/50"
      }`}
    >
      {/* 사진 */}
      <div className="flex h-[160px] flex-col items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-black/50 text-black/50">
        {menu.imageUrl ? (
          <img
            src={menu.imageUrl}
            alt={menu.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <PhotoIcon />
            <span className="text-[18px] font-medium">사진</span>
          </>
        )}
      </div>

      <p className="mt-[20px] text-[28px] font-medium text-black">
        {menu.name}
      </p>
      <p className="mt-[6px] text-[18px] font-medium text-black">
        {menu.price.toLocaleString()}원
      </p>

      {/* 판매 상태 토글은 카드 클릭(메뉴 수정)과 분리 */}
      <div
        className="mt-[16px] flex items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[18px] font-medium text-black">
          {menu.status === "판매중" ? "판매 중" : "품절"}
        </span>
        <Toggle
          checked={menu.status === "판매중"}
          onChange={onToggleStatus}
          label={`${menu.name} 판매 상태`}
        />
      </div>
    </div>
  );
}

function PhotoIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M4 18l5-5 4 4 3-3 4 4" />
    </svg>
  );
}
