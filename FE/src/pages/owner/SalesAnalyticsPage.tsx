import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminShell from "../../components/AdminShell";
import {
  SalesMenuTable,
  type MenuSortKey,
} from "../../components/owner/sales/SalesMenuTable";
import { SalesHourlyChart } from "../../components/owner/sales/SalesHourlyChart";
import {
  SalesPeriodTable,
  type PeriodSortKey,
  type SalesPeriodRow,
} from "../../components/owner/sales/SalesPeriodTable";
import { ApiError } from "../../api/client";
import { adminSalesService } from "../../services/admin/salesService";
import type { HourlySalesResponse, MenuSalesResponse } from "../../types/api";
import { rangeFromDateInputs } from "../../utils/paymentExport";
import {
  addSeoulCalendarDays,
  addSeoulCalendarMonths,
  formatSeoulDateWithWeekday,
  seoulDateKey,
  seoulDayBoundsMs,
  seoulMondayOf,
  seoulSundayOf,
} from "../../utils/serverDate";

type SalesGrain = "daily" | "weekly" | "monthly" | "yearly" | "hourly";
type DailyPreset = "today" | "last3" | "custom";
type WeeklyPreset = "thisWeek" | "lastMonth" | "custom";
type HourlyPreset = "week" | "month" | "month3" | "month6";

type DateRange = { from: string; to: string };

const GRAINS: Array<{ id: SalesGrain; label: string }> = [
  { id: "daily", label: "일별" },
  { id: "weekly", label: "주별" },
  { id: "monthly", label: "월별" },
  { id: "yearly", label: "연도별" },
  { id: "hourly", label: "시간대별" },
];

const HOURLY_PRESETS: Array<{ id: HourlyPreset; label: string; months?: number; days?: number }> = [
  { id: "week", label: "1주", days: 6 },
  { id: "month", label: "1달", months: 1 },
  { id: "month3", label: "3달", months: 3 },
  { id: "month6", label: "6달", months: 6 },
];

function thisWeekRange(): DateRange | null {
  const today = seoulDateKey();
  const from = seoulMondayOf(today);
  const to = seoulSundayOf(today);
  if (!from || !to) return null;
  return { from, to };
}

function lastMonthWeekRange(): DateRange | null {
  const today = seoulDateKey();
  const monthAgo = addSeoulCalendarMonths(today, -1);
  if (!monthAgo) return null;
  const from = seoulMondayOf(monthAgo);
  const to = seoulSundayOf(today);
  if (!from || !to) return null;
  return { from, to };
}

function resolveDailyRange(
  preset: DailyPreset,
  customStart: string,
  customEnd: string,
): DateRange | null {
  const today = seoulDateKey();
  if (preset === "today") {
    return { from: today, to: today };
  }
  if (preset === "last3") {
    const todayBounds = seoulDayBoundsMs(today);
    const todayStart = todayBounds?.startMs ?? 0;
    const threeDaysAgo = todayStart - 2 * 24 * 60 * 60 * 1000;
    return { from: seoulDateKey(threeDaysAgo), to: today };
  }
  const range = rangeFromDateInputs(customStart, customEnd);
  if (!range) return null;
  return { from: customStart.slice(0, 10), to: customEnd.slice(0, 10) };
}

function resolveWeeklyRange(
  preset: WeeklyPreset,
  customStart: string,
  customEnd: string,
): DateRange | null {
  if (preset === "thisWeek") return thisWeekRange();
  if (preset === "lastMonth") return lastMonthWeekRange();
  const from = seoulMondayOf(customStart.slice(0, 10));
  const to = seoulSundayOf(customEnd.slice(0, 10));
  if (!from || !to || from > to) return null;
  return { from, to };
}

/** 오늘 포함. 1주=7일(today-6~today), 1/3/6달은 달력월. */
function resolveHourlyRange(preset: HourlyPreset): DateRange | null {
  const today = seoulDateKey();
  const spec = HOURLY_PRESETS.find((item) => item.id === preset);
  if (!spec) return null;
  const from =
    spec.days !== undefined
      ? addSeoulCalendarDays(today, -spec.days)
      : addSeoulCalendarMonths(today, -(spec.months ?? 1));
  if (!from) return null;
  return { from, to: today };
}

function grainTitle(grain: SalesGrain): string {
  switch (grain) {
    case "daily":
      return "일별";
    case "weekly":
      return "주별";
    case "monthly":
      return "월별";
    case "yearly":
      return "연도별";
    case "hourly":
      return "시간대별";
  }
}

function periodHeader(grain: SalesGrain): string {
  switch (grain) {
    case "daily":
      return "날짜";
    case "weekly":
      return "주간 기간";
    case "monthly":
      return "월";
    case "yearly":
      return "연도";
    case "hourly":
      return "시간";
  }
}

function pillClass(active: boolean): string {
  return `h-[48px] rounded-[10px] border border-black/50 px-[24px] text-[15px] font-medium ${
    active ? "bg-black text-white" : "bg-canvas text-black"
  }`;
}

export default function SalesAnalyticsPage() {
  const navigate = useNavigate();
  const [grain, setGrain] = useState<SalesGrain>("daily");
  const [dailyPreset, setDailyPreset] = useState<DailyPreset>("last3");
  const [weeklyPreset, setWeeklyPreset] = useState<WeeklyPreset>("thisWeek");
  const [hourlyPreset, setHourlyPreset] = useState<HourlyPreset>("week");
  const [customStart, setCustomStart] = useState(() => seoulDateKey());
  const [customEnd, setCustomEnd] = useState(() => seoulDateKey());
  const [weeklyStart, setWeeklyStart] = useState(() => seoulMondayOf(seoulDateKey()) ?? seoulDateKey());
  const [weeklyEnd, setWeeklyEnd] = useState(() => seoulSundayOf(seoulDateKey()) ?? seoulDateKey());
  const [periodRows, setPeriodRows] = useState<SalesPeriodRow[]>([]);
  const [hourlyRows, setHourlyRows] = useState<HourlySalesResponse[]>([]);
  const [menuRows, setMenuRows] = useState<MenuSalesResponse[]>([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [periodSort, setPeriodSort] = useState<{ key: PeriodSortKey; dir: "asc" | "desc" }>({
    key: "period",
    dir: "asc",
  });
  const [menuSort, setMenuSort] = useState<{ key: MenuSortKey; dir: "asc" | "desc" }>({
    key: "totalAmount",
    dir: "desc",
  });
  const requestIdRef = useRef(0);

  const range = useMemo(() => {
    if (grain === "daily") {
      return resolveDailyRange(dailyPreset, customStart, customEnd);
    }
    if (grain === "weekly") {
      return resolveWeeklyRange(weeklyPreset, weeklyStart, weeklyEnd);
    }
    if (grain === "hourly") {
      return resolveHourlyRange(hourlyPreset);
    }
    return null;
  }, [grain, dailyPreset, weeklyPreset, hourlyPreset, customStart, customEnd, weeklyStart, weeklyEnd]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const needsRange = grain === "daily" || grain === "weekly" || grain === "hourly";
    if (needsRange && !range) {
      setPeriodRows([]);
      setHourlyRows([]);
      setMenuRows([]);
      setPeriodError("기간을 올바르게 설정해 주세요.");
      setMenuError("기간을 올바르게 설정해 주세요.");
      setPeriodLoading(false);
      setMenuLoading(false);
      return;
    }

    const loadPeriod = async () => {
      setPeriodLoading(true);
      setPeriodError(null);
      try {
        let rows: SalesPeriodRow[] = [];
        if (grain === "daily" && range) {
          const data = await adminSalesService.getDailySales(range.from, range.to);
          rows = data.map((row) => ({
            periodKey: row.date,
            periodLabel: formatSeoulDateWithWeekday(row.date),
            paymentCount: row.paymentCount,
            totalAmount: row.totalAmount,
            averageAmount: row.averageAmount,
          }));
        } else if (grain === "weekly" && range) {
          const data = await adminSalesService.getWeeklySales(range.from, range.to);
          rows = data.map((row) => ({
            periodKey: row.weekStart,
            periodLabel: `${row.weekStart} ~ ${row.weekEnd}`,
            paymentCount: row.paymentCount,
            totalAmount: row.totalAmount,
            averageAmount: row.averageAmount,
          }));
        } else if (grain === "monthly") {
          const data = await adminSalesService.getMonthlySales();
          rows = data.map((row) => ({
            periodKey: row.yearMonth,
            periodLabel: row.yearMonth,
            paymentCount: row.paymentCount,
            totalAmount: row.totalAmount,
            averageAmount: row.averageAmount,
          }));
        } else if (grain === "yearly") {
          const data = await adminSalesService.getYearlySales();
          rows = data.map((row) => ({
            periodKey: String(row.year),
            periodLabel: String(row.year),
            paymentCount: row.paymentCount,
            totalAmount: row.totalAmount,
            averageAmount: row.averageAmount,
          }));
        } else if (grain === "hourly" && range) {
          const data = await adminSalesService.getHourlySales(range.from, range.to);
          if (requestIdRef.current !== requestId) return;
          setHourlyRows(data);
          setPeriodRows([]);
          return;
        }
        if (requestIdRef.current !== requestId) return;
        setHourlyRows([]);
        setPeriodRows(rows);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        console.error("기간 매출 조회 실패:", err);
        setPeriodRows([]);
        setHourlyRows([]);
        setPeriodError(
          err instanceof ApiError && err.message
            ? err.message
            : "매출 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      } finally {
        if (requestIdRef.current === requestId) setPeriodLoading(false);
      }
    };

    const loadMenu = async () => {
      if (grain === "hourly") {
        setMenuRows([]);
        setMenuLoading(false);
        setMenuError(null);
        return;
      }
      setMenuLoading(true);
      setMenuError(null);
      try {
        const rows =
          grain === "monthly" || grain === "yearly"
            ? await adminSalesService.getMenuSales()
            : await adminSalesService.getMenuSales(range?.from, range?.to);
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

    void loadPeriod();
    void loadMenu();
  }, [grain, range]);

  const selectGrain = (next: SalesGrain) => {
    setGrain(next);
    setPeriodSort({ key: "period", dir: "asc" });
  };

  const onWeeklyStartChange = (value: string) => {
    setWeeklyStart(seoulMondayOf(value) ?? value);
  };

  const onWeeklyEndChange = (value: string) => {
    setWeeklyEnd(seoulSundayOf(value) ?? value);
  };

  const weeklyStartLabel = weeklyStart
    ? `${weeklyStart} ~ ${seoulSundayOf(weeklyStart) ?? weeklyStart}`
    : "";
  const weeklyEndLabel = weeklyEnd
    ? `${seoulMondayOf(weeklyEnd) ?? weeklyEnd} ~ ${weeklyEnd}`
    : "";

  return (
    <AdminShell>
      <div className="flex h-full min-h-0 flex-col p-[16px] md:p-[24px] short:p-[12px]">
        <div className="mb-[16px] flex shrink-0 flex-wrap items-center gap-[12px] short:mb-[10px]">
          <button
            type="button"
            onClick={() => navigate("/admin/payments")}
            className="rounded-[10px] border border-black/30 px-[14px] py-[8px] text-[13px] font-medium text-black"
          >
            ← 결제 내역
          </button>
          <h1 className="text-[22px] font-bold text-black short:text-[18px]">매출 분석</h1>
        </div>

        <div className="mb-[16px] flex shrink-0 flex-wrap gap-[12px] md:gap-[16px]">
          {GRAINS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectGrain(item.id)}
              className={pillClass(grain === item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-[24px] overflow-auto">
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-[18px] font-bold text-black">{grainTitle(grain)}</h2>

            {grain === "daily" && (
              <div className="flex flex-wrap items-center gap-[12px] md:gap-[16px]">
                <button
                  type="button"
                  onClick={() => setDailyPreset("today")}
                  className={pillClass(dailyPreset === "today")}
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => setDailyPreset("last3")}
                  className={pillClass(dailyPreset === "last3")}
                >
                  최근 3일
                </button>
                <button
                  type="button"
                  onClick={() => setDailyPreset("custom")}
                  className={pillClass(dailyPreset === "custom")}
                >
                  기간 선택
                </button>
                {dailyPreset === "custom" && (
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
            )}

            {grain === "weekly" && (
              <div className="flex flex-wrap items-center gap-[12px] md:gap-[16px]">
                <button
                  type="button"
                  onClick={() => setWeeklyPreset("thisWeek")}
                  className={pillClass(weeklyPreset === "thisWeek")}
                >
                  이번주
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyPreset("lastMonth")}
                  className={pillClass(weeklyPreset === "lastMonth")}
                >
                  최근 1달
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyPreset("custom")}
                  className={pillClass(weeklyPreset === "custom")}
                >
                  기간 선택
                </button>
                {weeklyPreset === "custom" && (
                  <div className="flex flex-wrap items-center gap-[8px]">
                    <label className="flex flex-col gap-[4px] text-[12px] text-black/50">
                      시작 주
                      <input
                        type="date"
                        value={weeklyStart}
                        onChange={(e) => onWeeklyStartChange(e.target.value)}
                        className="h-[48px] rounded-[10px] border border-black/50 bg-canvas px-[12px] text-[15px] text-black outline-none focus:border-black"
                      />
                      <span>{weeklyStartLabel}</span>
                    </label>
                    <span className="mt-[20px] text-[14px] text-black/50">~</span>
                    <label className="flex flex-col gap-[4px] text-[12px] text-black/50">
                      종료 주
                      <input
                        type="date"
                        value={weeklyEnd}
                        onChange={(e) => onWeeklyEndChange(e.target.value)}
                        className="h-[48px] rounded-[10px] border border-black/50 bg-canvas px-[12px] text-[15px] text-black outline-none focus:border-black"
                      />
                      <span>{weeklyEndLabel}</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {grain === "hourly" && (
              <div className="flex flex-wrap items-center gap-[12px] md:gap-[16px]">
                {HOURLY_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setHourlyPreset(item.id)}
                    className={pillClass(hourlyPreset === item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {grain === "hourly" ? (
              <SalesHourlyChart
                rows={hourlyRows}
                loading={periodLoading}
                error={periodError}
                from={range?.from}
                to={range?.to}
              />
            ) : (
              <SalesPeriodTable
                rows={periodRows}
                loading={periodLoading}
                error={periodError}
                periodHeader={periodHeader(grain)}
                sortKey={periodSort.key}
                sortDir={periodSort.dir}
                onSort={(key) =>
                  setPeriodSort((prev) =>
                    prev.key === key
                      ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
                      : { key, dir: "asc" },
                  )
                }
              />
            )}
          </section>

          {grain !== "hourly" && (
          <section className="flex flex-col gap-[12px]">
            <h2 className="text-[18px] font-bold text-black">메뉴별 매출 분석</h2>
            <SalesMenuTable
              rows={menuRows}
              loading={menuLoading}
              error={menuError}
              sortKey={menuSort.key}
              sortDir={menuSort.dir}
              onSort={(key) =>
                setMenuSort((prev) =>
                  prev.key === key
                    ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
                    : { key, dir: "asc" },
                )
              }
            />
          </section>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
