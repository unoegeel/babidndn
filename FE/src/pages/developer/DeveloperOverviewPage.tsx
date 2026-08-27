import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DeveloperShell from "../../components/developer/DeveloperShell";
import { DEV_LABELS } from "../../constants/developerLabels";
import {
  developerAnalyticsService,
  seoulNow,
  seoulTodayStart,
} from "../../services/developer/analyticsService";
import type {
  ControlCenterInsights,
  ControlCenterOperations,
  ControlCenterOverview,
  InsightItem,
} from "../../types/developerAnalytics";

function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("ko-KR");
}

function pct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function formatProcessing(seconds: number | null | undefined, sampleCount: number): string {
  if (sampleCount <= 0 || seconds == null) return DEV_LABELS.noAnalyticsData;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  WARNING: 2,
  INFO: 3,
};

function pickTopInsights(items: InsightItem[], limit = 3): InsightItem[] {
  return [...items]
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
    )
    .slice(0, limit);
}

interface MetricCardProps {
  title: string;
  value: string;
  sub?: string;
  to?: string;
}

function MetricCard({ title, value, sub, to }: MetricCardProps) {
  const body = (
    <>
      <p className="text-xs text-gray-500">{title}</p>
      <p className="mt-1 text-xl font-semibold text-gray-100">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-500">{sub}</p>}
    </>
  );
  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-lg border border-white/10 bg-[#171b24] p-4 transition-colors hover:border-indigo-400/30"
      >
        {body}
      </Link>
    );
  }
  return <div className="rounded-lg border border-white/10 bg-[#171b24] p-4">{body}</div>;
}

const SHORTCUTS = [
  { to: "/dev/analytics", label: DEV_LABELS.analytics },
  { to: "/dev/events", label: DEV_LABELS.events },
  { to: "/dev/requests", label: DEV_LABELS.requests },
  { to: "/dev/errors", label: DEV_LABELS.errors },
  { to: "/dev/reconciliation", label: DEV_LABELS.reconciliation },
] as const;

export default function DeveloperOverviewPage() {
  const [overview, setOverview] = useState<ControlCenterOverview | null>(null);
  const [operations, setOperations] = useState<ControlCenterOperations | null>(null);
  const [insights, setInsights] = useState<ControlCenterInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const from = seoulTodayStart();
      const to = seoulNow();
      try {
        setLoading(true);
        setError(null);
        const [ov, op, ig] = await Promise.all([
          developerAnalyticsService.overview(from, to),
          developerAnalyticsService.operations(from, to),
          developerAnalyticsService.insights(from, to),
        ]);
        setOverview(ov);
        setOperations(op);
        setInsights(ig);
      } catch (err) {
        console.error(err);
        setError("개요 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const topInsights = insights ? pickTopInsights(insights.insights, 3) : [];
  const procSample = overview?.processingSampleCount ?? 0;

  return (
    <DeveloperShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-gray-100">{DEV_LABELS.overview}</h2>
          <p className="mt-1 text-sm text-gray-500">
            지금 서비스가 정상인지, 바로 확인할 문제가 있는지 봅니다. 상세 분석은 「분석」에서 확인하세요.
          </p>
        </section>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">서비스 현황</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="오늘 결제 주문"
              value={loading ? "…" : fmt(overview?.paidOrders)}
              sub={DEV_LABELS.paidOrdersHelp}
              to="/dev/analytics"
            />
            <MetricCard
              title="오늘 매출"
              value={loading ? "…" : overview ? `${fmt(overview.revenue)}원` : "—"}
              to="/dev/analytics"
            />
            <MetricCard
              title="현재 대기 주문"
              value={loading ? "…" : fmt(operations?.activeQueueSizeToday)}
              sub="오늘 PREPARING · READY"
              to="/dev/analytics"
            />
            <MetricCard
              title={DEV_LABELS.paymentProgressSuccessRate}
              value={loading ? "…" : pct(overview?.paymentSuccessRate)}
              sub={DEV_LABELS.paymentProgressSuccessRateHelp}
              to="/dev/analytics"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">시스템 상태</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="API p95"
              value={
                loading
                  ? "…"
                  : overview?.apiP95LatencyMs != null
                    ? `${fmt(overview.apiP95LatencyMs)}ms`
                    : DEV_LABELS.noAnalyticsData
              }
              to="/dev/analytics"
            />
            <MetricCard
              title="5xx"
              value={
                loading
                  ? "…"
                  : overview
                    ? `${fmt(overview.status5xxCount)}건 · ${pct(overview.status5xxRate)}`
                    : "—"
              }
              to="/dev/errors"
            />
            <MetricCard
              title="클라이언트 오류"
              value={loading ? "…" : `${fmt(overview?.clientErrorCount)}건`}
              to="/dev/errors"
            />
            <MetricCard
              title="서버 오류"
              value={loading ? "…" : `${fmt(overview?.backendErrorCount)}건`}
              to="/dev/errors"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">주의</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="결제 정합성 미해결"
              value={loading ? "…" : `${fmt(overview?.reconciliationOpenCount)}건`}
              to="/dev/reconciliation"
            />
            <MetricCard
              title="주문 처리시간"
              value={
                loading
                  ? "…"
                  : formatProcessing(overview?.avgProcessingSeconds, procSample)
              }
              sub={
                procSample > 0
                  ? `${DEV_LABELS.processingTimeHelp} · 분석 주문 수 ${fmt(procSample)}`
                  : DEV_LABELS.processingTimeHelp
              }
              to="/dev/analytics"
            />
            <MetricCard
              title="의미 있는 최근 문제"
              value={
                loading
                  ? "…"
                  : topInsights.length > 0
                    ? topInsights[0].title
                    : "눈에 띄는 이슈 없음"
              }
              sub={
                topInsights.length > 0
                  ? `${topInsights[0].severity} · 인사이트`
                  : "오늘 규칙 기반 인사이트"
              }
              to="/dev/analytics"
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-gray-300">인사이트</h3>
            <Link className="text-xs text-indigo-300 underline" to="/dev/analytics">
              전체 인사이트 보기
            </Link>
          </div>
          {loading && <p className="text-sm text-gray-500">{DEV_LABELS.loading}</p>}
          {!loading && topInsights.length === 0 && (
            <p className="text-sm text-gray-500">오늘 표시할 인사이트가 없습니다.</p>
          )}
          <ul className="space-y-2">
            {topInsights.map((ig, idx) => (
              <li
                key={`${ig.type}-${idx}`}
                className="rounded-lg border border-white/10 bg-[#171b24] px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-gray-300">
                    {ig.severity}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-100">{ig.title}</p>
                <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{ig.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">바로가기</h3>
          <div className="flex flex-wrap gap-2">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="rounded-md border border-white/10 bg-[#171b24] px-3 py-2 text-sm text-gray-300 hover:border-indigo-400/30 hover:text-indigo-200"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </DeveloperShell>
  );
}
