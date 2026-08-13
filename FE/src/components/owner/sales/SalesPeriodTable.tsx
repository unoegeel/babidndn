export type PeriodSortKey = "period" | "paymentCount" | "totalAmount" | "averageAmount";

export type SalesPeriodRow = {
  periodKey: string;
  periodLabel: string;
  paymentCount: number;
  totalAmount: number;
  averageAmount: number;
};

export function SalesPeriodTable({
  rows,
  loading,
  error,
  periodHeader,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: SalesPeriodRow[];
  loading: boolean;
  error: string | null;
  periodHeader: string;
  sortKey: PeriodSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: PeriodSortKey) => void;
}) {
  const sorted = [...rows].sort((a, b) => {
    const cmp =
      sortKey === "period"
        ? a.periodKey.localeCompare(b.periodKey)
        : a[sortKey] - b[sortKey];
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="max-h-[420px] min-h-[200px] overflow-auto rounded-[25px] border border-black/50 bg-canvas">
      <table className="w-full min-w-[640px] border-collapse text-[15px]">
        <thead>
          <tr className="bg-panel text-[16px] font-medium text-black">
            <SortTh label={periodHeader} column="period" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="결제건수" column="paymentCount" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh label="총 판매금액" column="totalAmount" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortTh
              label="건별 평균판매금액"
              column="averageAmount"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.periodKey} className="border-t border-black/20">
              <Td>{row.periodLabel}</Td>
              <Td>{row.paymentCount.toLocaleString()}건</Td>
              <Td>{row.totalAmount.toLocaleString()}원</Td>
              <Td>{row.averageAmount.toLocaleString()}원</Td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className={`py-[48px] text-center ${error ? "text-danger" : "text-black/50"}`}
              >
                {loading
                  ? "매출 데이터를 불러오는 중..."
                  : error ?? "해당 기간에 매출 데이터가 없습니다."}
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
  column: PeriodSortKey;
  sortKey: PeriodSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: PeriodSortKey) => void;
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
