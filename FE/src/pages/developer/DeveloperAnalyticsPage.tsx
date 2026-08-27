import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DeveloperShell from "../../components/developer/DeveloperShell";
import { DEV_LABELS, funnelStepLabelKo } from "../../constants/developerLabels";
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

function sec(n: number | null | undefined, sampleCount?: number): string {
  if (sampleCount != null && sampleCount <= 0) return DEV_LABELS.noAnalyticsData;
  if (n == null) return "—";
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
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
  { id: "overview", label: "개요" },
  { id: "sales", label: "주문·매출" },
  { id: "funnel", label: "퍼널" },
  { id: "menus", label: "메뉴 분석" },
  { id: "payments", label: "결제" },
  { id: "operations", label: "주문 운영" },
  { id: "performance", label: "API 성능" },
  { id: "reliability", label: "안정성" },
  { id: "insights", label: "인사이트" },
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
        <p className="text-sm text-gray-500">{DEV_LABELS.noData}</p>
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

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-sm font-medium text-gray-300">{children}</h3>;
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
            사용량 · 매출 · 퍼널 · 운영 · 성능 · 오류 · 정합성
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
              <option value="today">오늘 (KST)</option>
              <option value="7d">7일</option>
              <option value="30d">30일</option>
              <option value="custom">직접 지정</option>
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
            {DEV_LABELS.refresh}
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

        {loading && <p className="text-sm text-gray-500">{DEV_LABELS.loading}</p>}
        {error && <p className="text-sm text-rose-400">{error}</p>}

        {!loading && !error && tab === "overview" && overview && (
          <div className="space-y-5">
            <div className="space-y-2">
              <SectionTitle>주요</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  title="결제 주문"
                  value={fmt(overview.paidOrders)}
                  sub={DEV_LABELS.paidOrdersHelp}
                />
                <Kpi title="매출" value={`${fmt(overview.revenue)}원`} />
                <Kpi
                  title={DEV_LABELS.paymentProgressSuccessRate}
                  value={pct(overview.paymentSuccessRate)}
                  sub={DEV_LABELS.paymentProgressSuccessRateHelp}
                />
                <Kpi
                  title="주문 처리시간"
                  value={sec(overview.avgProcessingSeconds, overview.processingSampleCount)}
                  sub={
                    overview.processingSampleCount > 0
                      ? `${DEV_LABELS.processingTimeHelp} · 분석 주문 수 ${fmt(overview.processingSampleCount)}`
                      : DEV_LABELS.processingTimeHelp
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <SectionTitle>보조</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  title="평균 주문 금액"
                  value={
                    overview.averageOrderValue != null
                      ? `${fmt(overview.averageOrderValue)}원`
                      : "—"
                  }
                />
                <Kpi title="주문당 평균 메뉴 수" value={fmt(overview.averageItemsPerOrder)} />
                <Kpi
                  title="고유 방문자"
                  value={fmt(overview.uniqueVisitors)}
                  sub="메뉴 조회 기준"
                />
                <Kpi
                  title="결제 시작 이벤트"
                  value={fmt(overview.paymentStarts)}
                  sub={`성공 이벤트 ${fmt(overview.paymentSuccessEvents)}`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <SectionTitle>시스템</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Kpi
                  title="API p95"
                  value={
                    overview.apiP95LatencyMs != null
                      ? `${fmt(overview.apiP95LatencyMs)}ms`
                      : DEV_LABELS.noAnalyticsData
                  }
                />
                <Kpi
                  title="5xx"
                  value={`${fmt(overview.status5xxCount)} · ${pct(overview.status5xxRate)}`}
                />
                <Kpi title="클라이언트 오류" value={fmt(overview.clientErrorCount)} />
                <Kpi title="서버 오류" value={fmt(overview.backendErrorCount)} />
                <Kpi
                  title="정합성 미해결"
                  value={fmt(overview.reconciliationOpenCount)}
                  sub="결제 정합성 이슈"
                />
              </div>
            </div>
          </div>
        )}

        {!loading && !error && tab === "sales" && sales && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <Kpi title="결제 주문" value={fmt(sales.paidOrders)} sub={DEV_LABELS.paidOrdersHelp} />
              <Kpi title="매출" value={`${fmt(sales.revenue)}원`} />
              <Kpi
                title="평균 주문 금액"
                value={
                  sales.averageOrderValue != null ? `${fmt(sales.averageOrderValue)}원` : "—"
                }
              />
              <Kpi title="주문당 평균 메뉴 수" value={fmt(sales.averageItemsPerOrder)} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <HourBars
                label="시간대별 결제 주문"
                rows={sales.byHour.map((h) => ({ hour: h.hour, value: h.paidOrders }))}
              />
              <HourBars
                label="시간대별 매출"
                rows={sales.byHour.map((h) => ({ hour: h.hour, value: h.revenue }))}
              />
            </div>
            <p className="text-xs text-gray-500">
              메뉴별 판매·전환율은 「메뉴 분석」 탭에서 확인합니다.
            </p>
          </div>
        )}

        {!loading && !error && tab === "funnel" && funnel && (
          <div className="space-y-6">
            {funnel.largestDropOffStage ? (
              <p className="text-sm text-amber-300">
                최대 이탈: {formatDropOffStage(funnel.largestDropOffStage)}
              </p>
            ) : (
              <p className="text-sm text-gray-500">퍼널 분석 데이터 없음</p>
            )}
            <FunnelTable
              title="집계 퍼널 (고유 사용자)"
              help={DEV_LABELS.aggregateFunnelHelp}
              steps={funnel.aggregateByAnonymous}
            />
            <FunnelTable
              title="순차 진행 세션"
              help={DEV_LABELS.sequentialFunnelHelp}
              steps={funnel.sequentialBySession}
            />
            <Link className="text-sm text-indigo-300 underline" to="/dev/events">
              → 사용자 이벤트에서 확인
            </Link>
          </div>
        )}

        {!loading && !error && tab === "menus" && menus && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              전환율은 조회 {menus.minViewsForConversion}회 이상인 메뉴만 표시합니다. 결제 지표는
              완료된 결제(DONE) 기준입니다.
            </p>
            <div className="overflow-x-auto rounded border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-xs text-gray-400">
                  <tr>
                    <th className="px-3 py-2">메뉴</th>
                    <th className="px-3 py-2 text-right">조회</th>
                    <th className="px-3 py-2 text-right">장바구니 추가</th>
                    <th className="px-3 py-2 text-right">판매 수량</th>
                    <th className="px-3 py-2 text-right">매출</th>
                    <th className="px-3 py-2 text-right">조회→장바구니</th>
                    <th className="px-3 py-2 text-right">조회→구매</th>
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
                  {menus.menus.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-gray-500">
                        {DEV_LABELS.noData}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !error && tab === "payments" && payments && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Kpi title="결제 시작 이벤트" value={fmt(payments.paymentStartEvents)} sub="행동" />
              <Kpi title="결제 성공 이벤트" value={fmt(payments.paymentSuccessEvents)} sub="행동" />
              <Kpi title="결제 실패 이벤트" value={fmt(payments.paymentFailEvents)} sub="행동" />
              <Kpi
                title={DEV_LABELS.paymentProgressSuccessRate}
                value={pct(payments.behaviorSuccessRate)}
                sub={DEV_LABELS.paymentProgressSuccessRateHelp}
              />
              <Kpi title="완료 결제 (DONE)" value={fmt(payments.donePayments)} sub="거래" />
              <Kpi title="취소 (CANCELED)" value={fmt(payments.canceledPayments)} />
              <Kpi title="부분 취소" value={fmt(payments.partialCanceledPayments)} />
              <Kpi title="DONE 비중" value={pct(payments.transactionalDoneShare)} />
              <Kpi title="정합성 미해결" value={fmt(payments.reconciliationOpenCount)} />
              <Kpi title="정합성 해결됨" value={fmt(payments.reconciliationResolvedCount)} />
            </div>
            <Link className="text-sm text-indigo-300 underline" to="/dev/reconciliation">
              → 결제 정합성에서 이슈 확인
            </Link>
          </div>
        )}

        {!loading && !error && tab === "operations" && operations && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">{DEV_LABELS.processingTimeHelp}</p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Kpi title="현재 대기 주문" value={fmt(operations.activeQueueSizeToday)} />
              <Kpi title="PREPARING" value={fmt(operations.preparingCountToday)} />
              <Kpi title="READY" value={fmt(operations.readyCountToday)} />
              <Kpi
                title="주문 처리시간 (평균)"
                value={sec(operations.avgProcessingSeconds, operations.processingSampleCount)}
              />
              <Kpi
                title="p50"
                value={sec(operations.p50ProcessingSeconds, operations.processingSampleCount)}
              />
              <Kpi
                title="p95"
                value={sec(operations.p95ProcessingSeconds, operations.processingSampleCount)}
              />
              <Kpi title="분석 주문 수" value={fmt(operations.processingSampleCount)} />
              <Kpi title="10분 이상" value={fmt(operations.slowProcessingCount)} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <HourBars
                label="시간대별 대기열 진입"
                rows={operations.queueEntriesByHour.map((h) => ({ hour: h.hour, value: h.count }))}
              />
              <HourBars
                label="시간대별 평균 처리시간 (초)"
                rows={operations.processingAvgByHour.map((h) => ({
                  hour: h.hour,
                  value: Math.round(h.avgSeconds ?? 0),
                }))}
              />
            </div>
          </div>
        )}

        {!loading && !error && tab === "performance" && performance && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Kpi title="API 요청" value={fmt(performance.totalRequests)} />
              <Kpi title="4xx 비율" value={pct(performance.rate4xx)} />
              <Kpi title="5xx 비율" value={pct(performance.rate5xx)} />
              <Kpi
                title="p50"
                value={
                  performance.p50LatencyMs != null
                    ? `${fmt(performance.p50LatencyMs)}ms`
                    : DEV_LABELS.noAnalyticsData
                }
              />
              <Kpi
                title="p95"
                value={
                  performance.p95LatencyMs != null
                    ? `${fmt(performance.p95LatencyMs)}ms`
                    : DEV_LABELS.noAnalyticsData
                }
              />
              <Kpi
                title="p99"
                value={
                  performance.p99LatencyMs != null
                    ? `${fmt(performance.p99LatencyMs)}ms`
                    : DEV_LABELS.noAnalyticsData
                }
              />
            </div>
            <HourBars
              label="시간대별 API 요청"
              rows={performance.byHour.map((h) => ({ hour: h.hour, value: h.requests }))}
            />
            <div className="overflow-x-auto rounded border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-xs text-gray-400">
                  <tr>
                    <th className="px-3 py-2">endpoint</th>
                    <th className="px-3 py-2 text-right">요청</th>
                    <th className="px-3 py-2 text-right">평균</th>
                    <th className="px-3 py-2 text-right">p95</th>
                    <th className="px-3 py-2 text-right">5xx</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.topEndpoints.map((e) => (
                    <tr key={e.path} className="border-t border-white/5">
                      <td className="max-w-md truncate px-3 py-2 font-mono text-xs text-gray-300">
                        {e.path}
                      </td>
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
              → 요청에서 확인
            </Link>
          </div>
        )}

        {!loading && !error && tab === "reliability" && reliability && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Kpi title="클라이언트 오류" value={fmt(reliability.clientErrorCount)} />
              <Kpi title="서버 오류" value={fmt(reliability.backendErrorCount)} />
              <Kpi
                title="클라이언트 오류 /1k 요청"
                value={fmt(reliability.clientErrorPer1kRequests)}
              />
              <Kpi
                title="서버 오류 /1k 요청"
                value={fmt(reliability.backendErrorPer1kRequests)}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <NamedList title="주요 클라이언트 출처" rows={reliability.topClientSources} />
              <NamedList title="주요 클라이언트 경로" rows={reliability.topClientRoutes} />
              <NamedList title="주요 서버 예외" rows={reliability.topBackendExceptions} />
              <NamedList title="주요 서버 경로" rows={reliability.topBackendPaths} />
            </div>
            <Link className="text-sm text-indigo-300 underline" to="/dev/errors">
              → 오류에서 확인
            </Link>
          </div>
        )}

        {!loading && !error && tab === "insights" && insights && (
          <InsightsPanel insights={insights} />
        )}
      </div>
    </DeveloperShell>
  );
}

function formatDropOffStage(raw: string): string {
  return raw
    .split(" → ")
    .map((part) => funnelStepLabelKo(part.trim(), part.trim()))
    .join(" → ");
}

function FunnelTable({
  title,
  help,
  steps,
}: {
  title: string;
  help: string;
  steps: ControlCenterFunnel["aggregateByAnonymous"];
}) {
  const max = Math.max(0, ...steps.map((s) => s.uniqueCount));
  return (
    <div>
      <p className="mb-0.5 text-sm text-gray-300">{title}</p>
      <p className="mb-2 text-xs text-gray-500">{help}</p>
      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.eventType}>
            <div className="mb-0.5 flex justify-between text-xs text-gray-400">
              <span>{funnelStepLabelKo(s.eventType, s.label)}</span>
              <span className="font-mono">
                {fmt(s.uniqueCount)} · 이벤트 {fmt(s.eventCount)} · 전환 {pct(s.stepConversion)} ·
                이탈 {pct(s.dropOffRate)}
              </span>
            </div>
            <div className="h-2 rounded bg-white/5">
              <div
                className="h-2 rounded bg-emerald-500/60"
                style={{ width: barWidth(s.uniqueCount, max) }}
              />
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

function InsightsPanel({ insights }: { insights: ControlCenterInsights }) {
  const [openEvidence, setOpenEvidence] = useState<Record<number, boolean>>({});

  if (insights.insights.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        기간 내 규칙 기반 인사이트가 없습니다 (표본/임계값 미충족).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {insights.insights.map((ig, idx) => (
        <div key={`${ig.type}-${idx}`} className="rounded-lg border border-white/10 bg-[#171b24] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase text-gray-300">
              {ig.severity}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-100">{ig.title}</p>
          <p className="mt-1 text-sm text-gray-400">{ig.description}</p>
          {ig.metric && (
            <p className="mt-2 text-xs text-gray-500">
              핵심 근거: <span className="font-mono text-gray-400">{ig.metric}</span>
            </p>
          )}
          <button
            type="button"
            className="mt-2 text-xs text-indigo-300 underline"
            onClick={() =>
              setOpenEvidence((prev) => ({ ...prev, [idx]: !prev[idx] }))
            }
          >
            {openEvidence[idx] ? "근거 접기" : "근거 보기"}
          </button>
          {openEvidence[idx] && (
            <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-2 text-[11px] text-gray-400">
              {JSON.stringify(ig.evidence, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
