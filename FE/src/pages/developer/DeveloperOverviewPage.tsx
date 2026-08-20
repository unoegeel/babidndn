import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DeveloperShell from "../../components/developer/DeveloperShell";
import { DEV_LABELS } from "../../constants/developerLabels";
import { developerOverviewService } from "../../services/developer/overviewService";
import type { ClientEventType } from "../../types/clientEvent";
import type { DeveloperOverview } from "../../types/developerOverview";
import { eventTypeLabelKo } from "../../utils/clientEventLabels";
import { formatErrorTime } from "../../utils/developerErrorFormat";

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function pct(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

interface DashboardCardProps {
  to: string;
  title: string;
  primary: string;
  secondary?: string;
  detail?: string;
}

function DashboardCard({ to, title, primary, secondary, detail }: DashboardCardProps) {
  return (
    <Link
      to={to}
      className="group block rounded-lg border border-white/10 bg-[#171b24] p-4 transition-colors hover:border-indigo-400/30 hover:bg-[#1a1f2a]"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
        <span className="text-[10px] font-medium uppercase tracking-wide text-indigo-300/70 opacity-0 transition-opacity group-hover:opacity-100">
          상세 →
        </span>
      </div>
      <p className="text-2xl font-semibold text-gray-100">{primary}</p>
      {secondary && <p className="mt-1 text-xs text-gray-400">{secondary}</p>}
      {detail && <p className="mt-2 text-[11px] text-gray-500">{detail}</p>}
    </Link>
  );
}

export default function DeveloperOverviewPage() {
  const [data, setData] = useState<DeveloperOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const overview = await developerOverviewService.get();
        setData(overview);
      } catch (err) {
        console.error(err);
        setError("개요 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const errors = data?.errors;
  const requests = data?.requests;
  const events = data?.events;
  const funnel = data?.funnel;

  const paymentConversion =
    funnel && funnel.checkoutViews > 0
      ? pct(funnel.paymentSuccesses, funnel.checkoutViews)
      : "0%";

  return (
    <DeveloperShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-100">{DEV_LABELS.overview}</h2>
          <p className="mt-1 text-sm text-gray-500">
            운영 관측 데이터 요약 Dashboard — 카드를 클릭하면 상세 페이지로 이동합니다.
          </p>
        </section>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DashboardCard
            to="/dev/errors"
            title={DEV_LABELS.errors}
            primary={loading ? "…" : `${fmt(errors?.last24h ?? 0)}건`}
            secondary={
              loading
                ? undefined
                : `서버 ${fmt(errors?.serverErrors ?? 0)} / FE ${fmt(errors?.frontendErrors ?? 0)}`
            }
            detail={
              loading
                ? "최근 24시간"
                : errors?.lastOccurredAt
                  ? `최근 ${formatErrorTime(errors.lastOccurredAt)}`
                  : "최근 24시간 · 기록 없음"
            }
          />

          <DashboardCard
            to="/dev/requests"
            title={DEV_LABELS.requests}
            primary={loading ? "…" : `${fmt(requests?.today ?? 0)}건`}
            secondary={
              loading
                ? undefined
                : `2xx ${fmt(requests?.success ?? 0)} · 4xx ${fmt(requests?.clientErrors ?? 0)} · 5xx ${fmt(requests?.serverErrors ?? 0)}`
            }
            detail={
              loading
                ? "오늘"
                : `평균 ${fmt(requests?.averageDurationMs ?? 0)}ms`
            }
          />

          <DashboardCard
            to="/dev/events"
            title={DEV_LABELS.events}
            primary={loading ? "…" : `${fmt(events?.today ?? 0)}건`}
            secondary={
              loading
                ? undefined
                : `Unique Session ${fmt(events?.uniqueSessions ?? 0)}`
            }
            detail={
              loading
                ? "오늘"
                : events?.topEvent
                  ? `주요 이벤트: ${eventTypeLabelKo(events.topEvent as ClientEventType)}`
                  : "오늘 · 이벤트 없음"
            }
          />

          <DashboardCard
            to="/dev/analytics"
            title={DEV_LABELS.funnelAnalytics}
            primary={loading ? "…" : `${paymentConversion} 전환`}
            secondary={
              loading
                ? undefined
                : `결제 성공 ${fmt(funnel?.paymentSuccesses ?? 0)} · 주문 완료 ${fmt(funnel?.ordersCompleted ?? 0)}`
            }
            detail={
              loading
                ? "오늘"
                : `방문 ${fmt(funnel?.uniqueVisitors ?? 0)}명 · 메뉴 조회 ${fmt(funnel?.menuViews ?? 0)}`
            }
          />
        </section>
      </div>
    </DeveloperShell>
  );
}
