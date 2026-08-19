import { useCallback, useEffect, useState } from "react";
import DeveloperShell from "../../components/developer/DeveloperShell";
import {
  daysAgoUtc,
  developerAnalyticsService,
  seoulNow,
  seoulTodayStart,
} from "../../services/developer/analyticsService";
import type {
  AnalyticsFunnel,
  AnalyticsMenus,
  AnalyticsOptions,
  AnalyticsOverview,
  FunnelStep,
  MenuAnalyticsItem,
  OptionAnalyticsItem,
  PeriodPreset,
} from "../../types/developerAnalytics";

// ────────── helpers ──────────

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function barWidth(current: number, max: number): string {
  if (max === 0) return "0%";
  return `${Math.min(100, (current / max) * 100).toFixed(1)}%`;
}

// ────────── 기간 계산 ──────────

interface PeriodRange {
  from: string;
  to: string;
}

function resolveRange(preset: PeriodPreset, customFrom: string, customTo: string): PeriodRange {
  const now = seoulNow();
  switch (preset) {
    case "today":
      return { from: seoulTodayStart(), to: now };
    case "7d":
      return { from: daysAgoUtc(7), to: now };
    case "30d":
      return { from: daysAgoUtc(30), to: now };
    case "custom":
      return { from: customFrom || seoulTodayStart(), to: customTo || now };
  }
}

// ────────── KPI Card ──────────

function KpiCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: number | null;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#171b24] p-4">
      <p className="text-xs text-gray-500">{title}</p>
      {value === null ? (
        <p className="mt-1 text-sm text-gray-500">불러오는 중...</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-semibold text-gray-100">{fmt(value)}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
        </>
      )}
    </div>
  );
}

// ────────── Funnel ──────────

function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  if (steps.length === 0) {
    return <p className="text-sm text-gray-500">데이터 없음</p>;
  }
  const maxUsers = steps[0].uniqueUsers;

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div key={step.eventType}>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{step.label}</span>
            <span className="font-mono">
              {fmt(step.uniqueUsers)}명 · {pct(step.conversionRate)}
              {idx > 0 && (
                <span className="ml-2 text-gray-600">
                  (전 단계 {pct(step.stepConversion)})
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-indigo-500/60"
              style={{ width: barWidth(step.uniqueUsers, maxUsers) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────── Menu Table ──────────

function MenuTable({
  title,
  items,
  valueKey,
  valueLabel,
}: {
  title: string;
  items: MenuAnalyticsItem[];
  valueKey: "views" | "cartAdds";
  valueLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <p className="text-sm text-gray-500">데이터 없음</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <table className="min-w-full text-xs">
        <thead className="text-[11px] text-gray-500">
          <tr>
            <th className="pb-1 text-left font-medium">메뉴</th>
            <th className="pb-1 text-right font-medium">{valueLabel}</th>
            {valueKey === "views" && (
              <th className="pb-1 text-right font-medium">고유 방문자</th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.menuId} className="border-t border-white/5">
              <td className="py-1.5 text-gray-200">
                <span className="mr-2 text-gray-500">{i + 1}.</span>
                {item.menuName}
              </td>
              <td className="py-1.5 text-right font-mono text-gray-300">{fmt(item[valueKey])}</td>
              {valueKey === "views" && (
                <td className="py-1.5 text-right font-mono text-gray-500">
                  {fmt(item.uniqueViewers)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ────────── Option Table ──────────

function OptionTable({ items }: { items: OptionAnalyticsItem[] }) {
  if (items.length === 0) {
    return (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          옵션 선택 순위
        </p>
        <p className="text-sm text-gray-500">데이터 없음</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        옵션 선택 순위
      </p>
      <table className="min-w-full text-xs">
        <thead className="text-[11px] text-gray-500">
          <tr>
            <th className="pb-1 text-left font-medium">옵션</th>
            <th className="pb-1 text-left font-medium">그룹</th>
            <th className="pb-1 text-right font-medium">선택 횟수</th>
            <th className="pb-1 text-right font-medium">고유 사용자</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.optionId} className="border-t border-white/5">
              <td className="py-1.5 text-gray-200">
                <span className="mr-2 text-gray-500">{i + 1}.</span>
                {item.optionName}
              </td>
              <td className="py-1.5 font-mono text-gray-500">{item.optionGroup ?? "-"}</td>
              <td className="py-1.5 text-right font-mono text-gray-300">
                {fmt(item.selectionCount)}
              </td>
              <td className="py-1.5 text-right font-mono text-gray-500">
                {fmt(item.uniqueUsers)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ────────── Main Page ──────────

export default function DeveloperAnalyticsPage() {
  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [funnel, setFunnel] = useState<AnalyticsFunnel | null>(null);
  const [menus, setMenus] = useState<AnalyticsMenus | null>(null);
  const [options, setOptions] = useState<AnalyticsOptions | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: PeriodPreset, cf: string, ct: string) => {
    const range = resolveRange(p, cf, ct);
    try {
      setLoading(true);
      setError(null);
      const [ov, fn, mn, op] = await Promise.all([
        developerAnalyticsService.overview(range.from, range.to),
        developerAnalyticsService.funnel(range.from, range.to),
        developerAnalyticsService.menus(range.from, range.to),
        developerAnalyticsService.options(range.from, range.to),
      ]);
      setOverview(ov);
      setFunnel(fn);
      setMenus(mn);
      setOptions(op);
    } catch (err) {
      console.error(err);
      setError("분석 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(preset, customFrom, customTo);
  }, [load, preset, customFrom, customTo]);

  const PRESETS: { value: PeriodPreset; label: string }[] = [
    { value: "today", label: "오늘" },
    { value: "7d", label: "최근 7일" },
    { value: "30d", label: "최근 30일" },
    { value: "custom", label: "직접 선택" },
  ];

  return (
    <DeveloperShell>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 헤더 */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">분석</h2>
            <p className="text-sm text-gray-500">사용자 행동 기반 Analytics</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPreset(p.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  preset === p.value
                    ? "bg-indigo-500/25 text-indigo-200"
                    : "border border-white/10 text-gray-400 hover:bg-white/5"
                }`}
              >
                {p.label}
              </button>
            ))}
            {preset === "custom" && (
              <>
                <input
                  type="datetime-local"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-md border border-white/10 bg-[#0f1117] px-2 py-1 text-xs text-gray-100"
                />
                <span className="text-gray-600">~</span>
                <input
                  type="datetime-local"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-md border border-white/10 bg-[#0f1117] px-2 py-1 text-xs text-gray-100"
                />
              </>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        {/* KPI */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            KPI
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="방문자 (메뉴 조회 기준)"
              value={loading ? null : (overview?.uniqueVisitors ?? 0)}
              sub="고유 사용자"
            />
            <KpiCard
              title="메뉴 조회"
              value={loading ? null : (overview?.menuViews ?? 0)}
              sub={overview ? `${fmt(overview.uniqueVisitors)}명` : undefined}
            />
            <KpiCard
              title="장바구니 추가"
              value={loading ? null : (overview?.cartAdds ?? 0)}
            />
            <KpiCard
              title="결제 화면 진입"
              value={loading ? null : (overview?.checkoutViews ?? 0)}
            />
            <KpiCard
              title="결제 시작"
              value={loading ? null : (overview?.paymentStarts ?? 0)}
            />
            <KpiCard
              title="결제 성공"
              value={loading ? null : (overview?.paymentSuccesses ?? 0)}
            />
            <KpiCard
              title="주문 생성"
              value={loading ? null : (overview?.ordersCreated ?? 0)}
            />
            <KpiCard
              title="주문 완료"
              value={loading ? null : (overview?.ordersCompleted ?? 0)}
            />
          </div>
        </section>

        {/* Funnel */}
        <section className="rounded-lg border border-white/10 bg-[#171b24] p-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
            주문 퍼널
          </p>
          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : (
            <FunnelChart steps={funnel?.steps ?? []} />
          )}
          <p className="mt-3 text-[11px] text-gray-600">
            * 단계별 고유 사용자 수 비교 (기간 내, session-based funnel 아님)
          </p>
        </section>

        {/* 메뉴 분석 */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#171b24] p-4">
            {loading ? (
              <p className="text-sm text-gray-500">불러오는 중...</p>
            ) : (
              <MenuTable
                title="메뉴 조회 순위"
                items={menus?.topMenusByViews ?? []}
                valueKey="views"
                valueLabel="조회 수"
              />
            )}
          </div>
          <div className="rounded-lg border border-white/10 bg-[#171b24] p-4">
            {loading ? (
              <p className="text-sm text-gray-500">불러오는 중...</p>
            ) : (
              <MenuTable
                title="장바구니 추가 순위"
                items={menus?.topMenusByCartAdds ?? []}
                valueKey="cartAdds"
                valueLabel="추가 수"
              />
            )}
          </div>
        </section>

        {/* 옵션 분석 */}
        <section className="rounded-lg border border-white/10 bg-[#171b24] p-4">
          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : (
            <OptionTable items={options?.topOptions ?? []} />
          )}
          <p className="mt-3 text-[11px] text-gray-600">
            * 선택률은 정확한 노출 수를 알 수 없어 제공하지 않습니다.
          </p>
        </section>
      </div>
    </DeveloperShell>
  );
}
