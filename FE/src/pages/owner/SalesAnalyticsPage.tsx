import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../../components/AdminShell";
import {
  SalesDateTable,
  type DailySortKey,
} from "../../components/owner/sales/SalesDateTable";
import {
  SalesMenuTable,
  type MenuSortKey,
} from "../../components/owner/sales/SalesMenuTable";
import { ApiError } from "../../api/client";
import { adminSalesService } from "../../services/admin/salesService";
import type { DailySalesResponse, MenuSalesResponse } from "../../types/api";
import { rangeFromDateInputs } from "../../utils/paymentExport";
import { seoulDateKey, seoulDayBoundsMs } from "../../utils/serverDate";

type AnalyticsTab = "daily" | "menu";
type PeriodFilter = "today" | "last3" | "custom";

function resolveRange(
  period: PeriodFilter,
  customStart: string,
  customEnd: string,
): { from: string; to: string } | null {
  const today = seoulDateKey();
  if (period === "today") {
    return { from: today, to: today };
  }
  if (period === "last3") {
    const todayBounds = seoulDayBoundsMs(today);
    const todayStart = todayBounds?.startMs ?? 0;
    const threeDaysAgo = todayStart - 2 * 24 * 60 * 60 * 1000;
    return { from: seoulDateKey(threeDaysAgo), to: today };
  }
  const range = rangeFromDateInputs(customStart, customEnd);
  if (!range) return null;
  return { from: customStart.slice(0, 10), to: customEnd.slice(0, 10) };
}

export default function SalesAnalyticsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AnalyticsTab>("daily");
  const [period, setPeriod] = useState<PeriodFilter>("last3");
  const [customStart, setCustomStart] = useState(() => seoulDateKey());
  const [customEnd, setCustomEnd] = useState(() => seoulDateKey());
  const [dailyRows, setDailyRows] = useState<DailySalesResponse[]>([]);
  const [menuRows, setMenuRows] = useState<MenuSalesResponse[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [dailySort, setDailySort] = useState<{ key: DailySortKey; dir: "asc" | "desc" }>({
    key: "date",
    dir: "asc",
  });
  const [menuSort, setMenuSort] = useState<{ key: MenuSortKey; dir: "asc" | "desc" }>({
    key: "totalAmount",
    dir: "desc",
  });
  const requestIdRef = useRef(0);

  const range = useMemo(
    () => resolveRange(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!range) {
      if (tab === "daily") {
        setDailyRows([]);
        setDailyError("기간을 올바르게 설정해 주세요.");
        setDailyLoading(false);
      } else {
        setMenuRows([]);
        setMenuError("기간을 올바르게 설정해 주세요.");
        setMenuLoading(false);
      }
      return;
    }

    const load = async () => {
      if (tab === "daily") {
        setDailyLoading(true);
        setDailyError(null);
        try {
          const rows = await adminSalesService.getDailySales(range.from, range.to);
          if (requestIdRef.current !== requestId) return;
          setDailyRows(rows);
        } catch (err) {
          if (requestIdRef.current !== requestId) return;
          console.error("날짜별 매출 조회 실패:", err);
          setDailyRows([]);
          setDailyError(
            err instanceof ApiError && err.message
              ? err.message
              : "매출 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
          );
        } finally {
          if (requestIdRef.current === requestId) setDailyLoading(false);
        }
        return;
      }

      setMenuLoading(true);
      setMenuError(null);
      try {
        const rows = await adminSalesService.getMenuSales(range.from, range.to);
        if (requestIdRef.current !== requestId) return;
        setMenuRows(rows);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        console.error("메뉴별 매출 조회 실패:", err);
        setMenuRows([]);
        setMenuError(
          err instanceof ApiError && err.message
            ? err.message
            : "매출 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      } finally {
        if (requestIdRef.current === requestId) setMenuLoading(false);
      }
    };

    void load();
  }, [tab, range]);

  const toggleDailySort = (key: DailySortKey) => {
    setDailySort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const toggleMenuSort = (key: MenuSortKey) => {
    setMenuSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  return (
    <AdminShell>
      <div className="flex h-full min-h-0 flex-col p-[16px] md:p-[24px] short:p-[12px]">
        <div className="mb-[16px] flex shrink-0 flex-wrap items-center justify-between gap-[12px] short:mb-[10px]">
          <h1 className="text-[22px] font-bold text-black short:text-[18px]">매출 분석</h1>
          <button
            type="button"
            onClick={() => navigate("/admin/payments")}
            className="h-[40px] shrink-0 rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[14px] font-medium text-black short:h-[36px] short:text-[13px]"
          >
            결제 내역
          </button>
        </div>

        <div className="mb-[16px] flex flex-wrap gap-[12px] md:gap-[16px]">
          <button
            type="button"
            onClick={() => setTab("daily")}
            className={`h-[48px] rounded-[10px] border border-black/50 px-[24px] text-[15px] font-medium ${
              tab === "daily" ? "bg-black text-white" : "bg-canvas text-black"
            }`}
          >
            날짜별 매출 분석
          </button>
          <button
            type="button"
            onClick={() => setTab("menu")}
            className={`h-[48px] rounded-[10px] border border-black/50 px-[24px] text-[15px] font-medium ${
              tab === "menu" ? "bg-black text-white" : "bg-canvas text-black"
            }`}
          >
            메뉴별 매출 분석
          </button>
        </div>

        <div className="mb-[24px] flex flex-wrap items-center gap-[12px] md:gap-[16px]">
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              className="h-[48px] w-[160px] appearance-none rounded-[10px] border border-black/50 bg-canvas pl-[16px] pr-[40px] text-[15px] outline-none focus:border-black"
            >
              <option value="today">오늘</option>
              <option value="last3">최근 3일</option>
              <option value="custom">기간 선택</option>
            </select>
            <svg
              className="pointer-events-none absolute right-[14px] top-1/2 -translate-y-1/2 text-black"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-[8px]">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-[48px] rounded-[10px] border border-black/50 bg-canvas px-[12px] text-[15px] outline-none focus:border-black"
              />
              <span className="text-[14px] text-black/50">~</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-[48px] rounded-[10px] border border-black/50 bg-canvas px-[12px] text-[15px] outline-none focus:border-black"
              />
            </div>
          )}
        </div>

        {tab === "daily" ? (
          <SalesDateTable
            rows={dailyRows}
            loading={dailyLoading}
            error={dailyError}
            sortKey={dailySort.key}
            sortDir={dailySort.dir}
            onSort={toggleDailySort}
          />
        ) : (
          <SalesMenuTable
            rows={menuRows}
            loading={menuLoading}
            error={menuError}
            sortKey={menuSort.key}
            sortDir={menuSort.dir}
            onSort={toggleMenuSort}
          />
        )}
      </div>
    </AdminShell>
  );
}
