import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DeveloperShell from "../../components/developer/DeveloperShell";
import {
  daysAgoUtc,
  developerAnalyticsService,
  seoulNow,
  seoulTodayStart,
} from "../../services/developer/analyticsService";
import type {
  AnalyticsTab,
  ControlCenterFunnel,
  ControlCenterInsights,
  ControlCenterMenus,
  ControlCenterOperations,
  ControlCenterOverview,
  ControlCenterPayments,
  ControlCenterPerformance,
  ControlCenterReliability,
  ControlCenterSales,
  PeriodPreset,
} from "../../types/developerAnalytics";

function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("ko-KR");
}

function pct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function sec(n: number | null | undefined): string {
  if (n == null) return "—";
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function barWidth(current: number, max: number): string {
  if (max <= 0) return "0%";
  return `${Math.min(100, (current / max) * 100).toFixed(1)}%`;
}

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

const TABS: { id: AnalyticsTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sales", label: "Orders & Sales" },
  { id: "funnel", label: "Funnel" },
  { id: "menus", label: "Menus" },
  { id: "payments", label: "Payments" },
  { id: "operations", label: "Operations" },
  { id: "performance", label: "Performance" },
  { id: "reliability", label: "Reliability" },
  { id: "insights", label: "Insights" },
];

function Kpi({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#171b24] p-4">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="mt-1 text-xl font-semibold text-gray-100">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function HourBars({
  rows,
  label,
}: {
  rows: { hour: number; value: number }[];
  label: string;
}) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500">{label}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">데이터 없음</p>
      ) : (
        rows.map((r) => (
          <div key={r.hour} className="flex items-center gap-2 text-xs">
            <span className="w-10 font-mono text-gray-400">{String(r.hour).padStart(2, "0")}시</span>
            <div className="h-2 flex-1 rounded bg-white/5">
              <div
                className="h-2 rounded bg-indigo-500/70"
                style={{ width: barWidth(r.value, max) }}
              />
            </div>
            <span className="w-16 text-right font-mono text-gray-300">{fmt(r.value)}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function DeveloperAnalyticsPage() {
  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [tab, setTab] = useState<AnalyticsTab>("overview");

  const [overview, setOverview] = useState<ControlCenterOverview | null>(null);
  const [sales, setSales] = useState<ControlCenterSales | null>(null);
  const [funnel, setFunnel] = useState<ControlCenterFunnel | null>(null);
  const [menus, setMenus] = useState<ControlCenterMenus | null>(null);
  const [payments, setPayments] = useState<ControlCenterPayments | null>(null);
  const [operations, setOperations] = useState<ControlCenterOperations | null>(null);
  const [performance, setPerformance] = useState<ControlCenterPerformance | null>(null);
  const [reliability, setReliability] = useState<ControlCenterReliability | null>(null);
  const [insights, setInsights] = useState<ControlCenterInsights | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: PeriodPreset, cf: string, ct: string) => {
    const range = resolveRange(p, cf, ct);
    await Promise.resolve();
    try {
      setLoading(true);
      setError(null);
      const [ov, sl, fn, mn, py, op, pf, rl, ig] = await Promise.all([
        developerAnalyticsService.overview(range.from, range.to),
        developerAnalyticsService.sales(range.from, range.to),
        developerAnalyticsService.funnel(range.from, range.to),
        developerAnalyticsService.menus(range.from, range.to),
        developerAnalyticsService.payments(range.from, range.to),
        developerAnalyticsService.operations(range.from, range.to),
        developerAnalyticsService.performance(range.from, range.to),
        developerAnalyticsService.reliability(range.from, range.to),
        developerAnalyticsService.insights(range.from, range.to),
      ]);
      setOverview(ov);
      setSales(sl);
      setFunnel(fn);
      setMenus(mn);
      setPayments(py);
      setOperations(op);
      setPerformance(pf);
      setReliability(rl);
      setInsights(ig);
    } catch (err) {
      console.error(err);
      setError("분석 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await load(preset, customFrom, customTo);
    })();
  }, [load, preset, customFrom, customTo]);

  return (
    <DeveloperShell>
      <div className="space-y-4">
        <section>
          <h2 className="text-lg font-semibold text-gray-100">Analytics Control Center</h2>
          <p className="mt-1 text-sm text-gray-500">
            사용량 · 매출 · 퍼널 · 운영 · 성능 · 오류 · 정합성 — read-only. QR analytics 제외.
          </p>
        </section>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-400">
            기간
            <select
              className="ml-2 rounded border border-white/10 bg-[#0f131a] px-2 py-1.5 text-sm text-gray-100"
              value={preset}
              onChange={(e) => setPreset(e.target.value as PeriodPreset)}
            >
              <option value="today">Today (KST)</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {preset === "custom" && (
            <>
              <input
                type="datetime-local"
                className="rounded border border-white/10 bg-[#0f131a] px-2 py-1.5 text-sm text-gray-100"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <input
                type="datetime-local"
                className="rounded border border-white/10 bg-[#0f131a] px-2 py-1.5 text-sm text-gray-100"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </>
          )}
          <button
            type="button"
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white"
            onClick={() => void load(preset, customFrom, customTo)}
          >
            새로고침
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded px-3 py-1.5 text-xs ${
                tab === t.id
                  ? "bg-indigo-600/80 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-gray-500">불러오는 중…</p>}
        {error && <p className="text-sm text-rose-400">{error}</p>}

        {!loading && !error && tab === "overview" && overview && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi title="Paid orders" value={fmt(overview.paidOrders)} sub="payments DONE" />
              <Kpi title="Revenue" value={`${fmt(overview.revenue)}원`} />
              <Kpi title="AOV" value={overview.averageOrderValue != null ? `${fmt(overview.averageOrderValue)}원` : "—"} />
              <Kpi title="Items / order" value={fmt(overview.averageItemsPerOrder)} />
              <Kpi title="Pay success (behavior)" value={pct(overview.paymentSuccessRate)} sub="START→SUCCESS events" />
              <Kpi title="Avg process time" value={sec(overview.avgProcessingSeconds)} sub={`n=${overview.processingSampleCount}`} />
              <Kpi title="API p95" value={overview.apiP95LatencyMs != null ? `${fmt(overview.apiP95LatencyMs)}ms` : "—"} />
              <Kpi title="5xx rate" value={pct(overview.status5xxRate)} sub={`${fmt(overview.status5xxCount)}건`} />
              <Kpi title="Client errors" value={fmt(overview.clientErrorCount)} />
              <Kpi title="Backend errors" value={fmt(overview.backendErrorCount)} />
              <Kpi title="Recon OPEN" value={fmt(overview.reconciliationOpenCount)} />
              <Kpi title="Unique visitors" value={fmt(overview.uniqueVisitors)} sub="MENU_VIEW anonymous" />
            </div>
            <p className="text-xs text-gray-500">
              매출/결제 건수는 payments 정본. uniqueVisitors·paymentStarts는 client_events (행동 지표).
            </p>
          </div>
        )}

        {!loading && !error && tab === "sales" && sales && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Kpi title="Paid orders" value={fmt(sales.paidOrders)} />
              <Kpi title="Revenue" value={`${fmt(sales.revenue)}원`} />
              <Kpi title="AOV" value={sales.averageOrderValue != null ? `${fmt(sales.averageOrderValue)}원` : "—"} />
              <Kpi title="Items/order" value={fmt(sales.averageItemsPerOrder)} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <HourBars
                label="Orders by hour"
                rows={sales.byHour.map((h) => ({ hour: h.hour, value: h.paidOrders }))}
              />
              <HourBars
                label="Revenue by hour"
                rows={sales.byHour.map((h) => ({ hour: h.hour, value: h.revenue }))}
              />
            </div>
            <div className="overflow-x-auto rounded border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-xs text-gray-400">
                  <tr>
                    <th className="px-3 py-2">Menu</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-right">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.byMenu.map((m) => (
                    <tr key={`${m.menuId}-${m.menuName}`} className="border-t border-white/5">
                      <td className="px-3 py-2 text-gray-200">{m.menuName}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(m.paidQuantity)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(m.paidRevenue)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(m.paidOrderCount)}</td>
                    </tr>
                  ))}
                  {sales.byMenu.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-gray-500">
                        데이터 없음
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !error && tab === "funnel" && funnel && (
          <div className="space-y-6">
            <p className="text-xs text-gray-500">{funnel.metricNote}</p>
            {funnel.largestDropOffStage && (
              <p className="text-sm text-amber-300">Largest drop-off (anonymous): {funnel.largestDropOffStage}</p>
            )}
            <FunnelTable title="Aggregate (distinct anonymous_id)" steps={funnel.aggregateByAnonymous} />
            <FunnelTable title="Sequential (session_id ordered)" steps={funnel.sequentialBySession} />
            <Link className="text-sm text-indigo-300 underline" to="/dev/events">
              → Events diagnostic
            </Link>
          </div>
        )}

        {!loading && !error && tab === "menus" && menus && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Conversion rates require views ≥ {menus.minViewsForConversion}. Paid metrics from order_items × DONE
              payments.
            </p>
            <div className="overflow-x-auto rounded border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-xs text-gray-400">
                  <tr>
                    <th className="px-3 py-2">Menu</th>
                    <th className="px-3 py-2 text-right">Views</th>
                    <th className="px-3 py-2 text-right">Cart</th>
                    <th className="px-3 py-2 text-right">Paid qty</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-right">View→Cart</th>
                    <th className="px-3 py-2 text-right">View→Buy</th>
                  </tr>
                </thead>
                <tbody>
                  {menus.menus.map((m) => (
                    <tr key={`${m.menuId}-${m.menuName}`} className="border-t border-white/5">
                      <td className="px-3 py-2 text-gray-200">{m.menuName}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(m.views)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(m.cartAdds)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(m.paidQuantity)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(m.paidRevenue)}</td>
                      <td className="px-3 py-2 text-right font-mono">{pct(m.viewToCartRate)}</td>
                      <td className="px-3 py-2 text-right font-mono">{pct(m.viewToPurchaseRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !error && tab === "payments" && payments && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Kpi title="START events" value={fmt(payments.paymentStartEvents)} sub="behavior" />
              <Kpi title="SUCCESS events" value={fmt(payments.paymentSuccessEvents)} sub="behavior" />
              <Kpi title="FAIL events" value={fmt(payments.paymentFailEvents)} sub="behavior" />
              <Kpi title="Behavior success" value={pct(payments.behaviorSuccessRate)} />
              <Kpi title="DONE payments" value={fmt(payments.donePayments)} sub="transactional" />
              <Kpi title="CANCELED" value={fmt(payments.canceledPayments)} />
              <Kpi title="PARTIAL_CANCELED" value={fmt(payments.partialCanceledPayments)} />
              <Kpi title="DONE share" value={pct(payments.transactionalDoneShare)} />
              <Kpi title="Recon OPEN" value={fmt(payments.reconciliationOpenCount)} />
              <Kpi title="Recon RESOLVED" value={fmt(payments.reconciliationResolvedCount)} />
            </div>
            <Link className="text-sm text-indigo-300 underline" to="/dev/reconciliation">
              → Reconciliation
            </Link>
          </div>
        )}

        {!loading && !error && tab === "operations" && operations && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Kpi title="Active queue (today)" value={fmt(operations.activeQueueSizeToday)} />
              <Kpi title="PREPARING" value={fmt(operations.preparingCountToday)} />
              <Kpi title="READY" value={fmt(operations.readyCountToday)} />
              <Kpi title="Avg process" value={sec(operations.avgProcessingSeconds)} />
              <Kpi title="p50" value={sec(operations.p50ProcessingSeconds)} />
              <Kpi title="p95" value={sec(operations.p95ProcessingSeconds)} />
              <Kpi title="Sample n" value={fmt(operations.processingSampleCount)} />
              <Kpi title="≥10m" value={fmt(operations.slowProcessingCount)} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <HourBars
                label="Queue entries by hour"
                rows={operations.queueEntriesByHour.map((h) => ({ hour: h.hour, value: h.count }))}
              />
              <HourBars
                label="Avg processing sec by hour"
                rows={operations.processingAvgByHour.map((h) => ({
                  hour: h.hour,
                  value: Math.round(h.avgSeconds ?? 0),
                }))}
              />
            </div>
            <p className="text-xs text-gray-500">
              Processing = calledAt − pickupAssignedAt (calledAt NULL 제외). updated_at 미사용.
            </p>
          </div>
        )}

        {!loading && !error && tab === "performance" && performance && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Kpi title="Requests" value={fmt(performance.totalRequests)} />
              <Kpi title="4xx rate" value={pct(performance.rate4xx)} />
              <Kpi title="5xx rate" value={pct(performance.rate5xx)} />
              <Kpi title="p50" value={performance.p50LatencyMs != null ? `${fmt(performance.p50LatencyMs)}ms` : "—"} />
              <Kpi title="p95" value={performance.p95LatencyMs != null ? `${fmt(performance.p95LatencyMs)}ms` : "—"} />
              <Kpi title="p99" value={performance.p99LatencyMs != null ? `${fmt(performance.p99LatencyMs)}ms` : "—"} />
            </div>
            <HourBars
              label="Requests by hour"
              rows={performance.byHour.map((h) => ({ hour: h.hour, value: h.requests }))}
            />
            <div className="overflow-x-auto rounded border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-xs text-gray-400">
                  <tr>
                    <th className="px-3 py-2">Path</th>
                    <th className="px-3 py-2 text-right">Req</th>
                    <th className="px-3 py-2 text-right">Avg</th>
                    <th className="px-3 py-2 text-right">p95</th>
                    <th className="px-3 py-2 text-right">5xx</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.topEndpoints.map((e) => (
                    <tr key={e.path} className="border-t border-white/5">
                      <td className="max-w-md truncate px-3 py-2 font-mono text-xs text-gray-300">{e.path}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(e.requests)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(Math.round(e.avgMs))}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(e.p95Ms)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmt(e.status5xx)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link className="text-sm text-indigo-300 underline" to="/dev/requests">
              → Requests
            </Link>
          </div>
        )}

        {!loading && !error && tab === "reliability" && reliability && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Kpi title="Client errors" value={fmt(reliability.clientErrorCount)} />
              <Kpi title="Backend errors" value={fmt(reliability.backendErrorCount)} />
              <Kpi title="Client /1k req" value={fmt(reliability.clientErrorPer1kRequests)} />
              <Kpi title="Backend /1k req" value={fmt(reliability.backendErrorPer1kRequests)} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <NamedList title="Top client sources" rows={reliability.topClientSources} />
              <NamedList title="Top client routes" rows={reliability.topClientRoutes} />
              <NamedList title="Top backend exceptions" rows={reliability.topBackendExceptions} />
              <NamedList title="Top backend paths" rows={reliability.topBackendPaths} />
            </div>
            <Link className="text-sm text-indigo-300 underline" to="/dev/errors">
              → Errors
            </Link>
          </div>
        )}

        {!loading && !error && tab === "insights" && insights && (
          <div className="space-y-3">
            {insights.insights.length === 0 && (
              <p className="text-sm text-gray-500">기간 내 규칙 기반 insight 없음 (sample/threshold 미충족).</p>
            )}
            {insights.insights.map((ig, idx) => (
              <div key={`${ig.type}-${idx}`} className="rounded-lg border border-white/10 bg-[#171b24] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase text-gray-300">
                    {ig.severity}
                  </span>
                  <span className="font-mono text-[10px] text-gray-500">{ig.type}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-100">{ig.title}</p>
                <p className="mt-1 text-sm text-gray-400">{ig.description}</p>
                <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-2 text-[11px] text-gray-400">
                  {JSON.stringify(ig.evidence, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </DeveloperShell>
  );
}

function FunnelTable({
  title,
  steps,
}: {
  title: string;
  steps: ControlCenterFunnel["aggregateByAnonymous"];
}) {
  const max = Math.max(0, ...steps.map((s) => s.uniqueCount));
  return (
    <div>
      <p className="mb-2 text-sm text-gray-300">{title}</p>
      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.eventType}>
            <div className="mb-0.5 flex justify-between text-xs text-gray-400">
              <span>
                {s.label}{" "}
                <span className="font-mono text-gray-600">({s.eventType})</span>
              </span>
              <span className="font-mono">
                {fmt(s.uniqueCount)} · events {fmt(s.eventCount)} · step {pct(s.stepConversion)} · drop{" "}
                {pct(s.dropOffRate)}
              </span>
            </div>
            <div className="h-2 rounded bg-white/5">
              <div className="h-2 rounded bg-emerald-500/60" style={{ width: barWidth(s.uniqueCount, max) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NamedList({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  return (
    <div className="rounded border border-white/10 p-3">
      <p className="mb-2 text-xs text-gray-500">{title}</p>
      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.name} className="flex justify-between gap-2 font-mono text-xs text-gray-300">
            <span className="truncate">{r.name}</span>
            <span>{fmt(r.count)}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-gray-500">없음</li>}
      </ul>
    </div>
  );
}
