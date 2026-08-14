import type { MenuSalesResponse } from "../../../types/api";

export type MenuSortKey = "menuName" | "itemQuantity" | "totalAmount";

export function SalesMenuTable({
  rows,
  loading,
  error,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: MenuSalesResponse[];
  loading: boolean;
  error: string | null;
  sortKey: MenuSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: MenuSortKey) => void;
}) {
  const sorted = [...rows].sort((a, b) => {
    const cmp =
      sortKey === "menuName"
        ? a.menuName.localeCompare(b.menuName, "ko")
        : a[sortKey] - b[sortKey];
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="max-h-[420px] min-h-[200px] overflow-auto rounded-[25px] border border-black/50 bg-canvas">
      <table className="w-full min-w-[520px] border-collapse text-[15px]">
        <thead>
          <tr className="bg-panel text-[16px] font-medium text-black">
            <SortTh label="메뉴" column="menuName" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="판매수량" column="itemQuantity" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="총 판매금액" column="totalAmount" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.menuName} className="border-t border-black/20">
              <Td>{row.menuName}</Td>
              <Td>{row.itemQuantity.toLocaleString()}</Td>
              <Td>{row.totalAmount.toLocaleString()}원</Td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td
                colSpan={3}
                className={`py-[48px] text-center ${error ? "text-danger" : "text-black/50"}`}
              >
                {loading
                  ? "매출 데이터를 불러오는 중..."
                  : error ?? "해당 기간에 판매된 메뉴가 없습니다."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortTh({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  column: MenuSortKey;
  sortKey: MenuSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: MenuSortKey) => void;
}) {
  const mark = sortKey === column ? (sortDir === "asc" ? "↑" : "↓") : "↕";
  return (
    <th className="px-[16px] py-[20px] text-center">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center justify-center gap-[6px] font-medium text-black"
      >
        {label}
        <span aria-hidden className="text-[13px] text-black/50">
          {mark}
        </span>
      </button>
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-[16px] py-[16px] text-center text-black">{children}</td>;
}
