import { useCallback, useEffect, useState } from "react";
import DeveloperShell from "../../components/developer/DeveloperShell";
import DeveloperEventDetailPanel from "../../components/developer/DeveloperEventDetailPanel";
import { DEV_LABELS } from "../../constants/developerLabels";
import { developerEventService } from "../../services/developer/eventService";
import type {
  DeveloperEventDetail,
  DeveloperEventPage,
  DeveloperEventQuery,
  DeveloperEventSummary,
} from "../../types/developerEvent";
import type { ClientEventType } from "../../types/clientEvent";
import {
  CLIENT_EVENT_TYPES,
  eventTypeLabelKo,
  truncateId,
} from "../../utils/clientEventLabels";
import { formatErrorTime } from "../../utils/developerErrorFormat";

const PAGE_SIZE = 50;

export default function DeveloperEventsPage() {
  const [query, setQuery] = useState<DeveloperEventQuery>({ page: 0, size: PAGE_SIZE });
  const [draftRoute, setDraftRoute] = useState("");
  const [draftAnonymousId, setDraftAnonymousId] = useState("");
  const [draftSessionId, setDraftSessionId] = useState("");
  const [draftRelatedRequestId, setDraftRelatedRequestId] = useState("");
  const [pageData, setPageData] = useState<DeveloperEventPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DeveloperEventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async (params: DeveloperEventQuery) => {
    await Promise.resolve();
    try {
      setLoading(true);
      setError(null);
      const data = await developerEventService.list(params);
      setPageData(data);
    } catch (err) {
      console.error(err);
      setError("이벤트 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await loadList(query);
    })();
  }, [loadList, query]);

  if (selectedId == null && detail !== null) {
    setDetail(null);
  }

  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;
    void (async () => {
      try {
        setDetailLoading(true);
        const data = await developerEventService.detail(selectedId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const applyFilters = () => {
    setQuery((prev) => ({
      ...prev,
      route: draftRoute.trim() || undefined,
      anonymousId: draftAnonymousId.trim() || undefined,
      sessionId: draftSessionId.trim() || undefined,
      relatedRequestId: draftRelatedRequestId.trim() || undefined,
      page: 0,
    }));
  };

  const updateFilter = (patch: Partial<DeveloperEventQuery>) => {
    setQuery((prev) => ({ ...prev, ...patch, page: 0 }));
  };

  const goPage = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  return (
    <DeveloperShell>
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">{DEV_LABELS.eventMonitoring}</h2>
          <p className="text-sm text-gray-500">사용자가 서비스에서 수행한 주요 행동을 확인합니다.</p>
        </div>

        <div className="min-w-0 rounded-lg border border-white/10 bg-[#171b24] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-0 w-full flex-col gap-1 sm:w-auto sm:min-w-[10rem]">
              <span className="text-[11px] font-medium text-gray-500">{DEV_LABELS.eventType}</span>
              <select
                value={query.eventType ?? ""}
                onChange={(e) => updateFilter({ eventType: e.target.value as ClientEventType | "" })}
                className="min-w-0 w-full rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100"
              >
                <option value="">{DEV_LABELS.allEventTypes}</option>
                {CLIENT_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {eventTypeLabelKo(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 w-full flex-col gap-1 sm:w-auto">
              <span className="text-[11px] font-medium text-gray-500">시작 기간</span>
              <input
                type="datetime-local"
                value={toDateTimeLocal(query.from)}
                onChange={(e) => updateFilter({ from: fromDateTimeLocal(e.target.value) })}
                className="min-w-0 w-full rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100 sm:w-auto"
              />
            </label>
            <label className="flex min-w-0 flex-1 basis-[9rem] flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-500">{DEV_LABELS.route}</span>
              <input
                value={draftRoute}
                onChange={(e) => setDraftRoute(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="경로"
                className="min-w-0 w-full rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100"
              />
            </label>
            <label className="flex min-w-0 flex-1 basis-[9rem] flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-500">{DEV_LABELS.anonymousId}</span>
              <input
                value={draftAnonymousId}
                onChange={(e) => setDraftAnonymousId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="익명 사용자"
                className="min-w-0 w-full rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100"
              />
            </label>
            <label className="flex min-w-0 flex-1 basis-[9rem] flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-500">{DEV_LABELS.sessionId}</span>
              <input
                value={draftSessionId}
                onChange={(e) => setDraftSessionId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="세션"
                className="min-w-0 w-full rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100"
              />
            </label>
            <label className="flex min-w-0 flex-1 basis-[9rem] flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-500">{DEV_LABELS.relatedRequestId}</span>
              <input
                value={draftRelatedRequestId}
                onChange={(e) => setDraftRelatedRequestId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="관련 요청 ID"
                className="min-w-0 w-full rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100"
              />
            </label>
            <button
              type="button"
              onClick={applyFilters}
              className="h-[38px] w-full shrink-0 rounded-md bg-indigo-500/20 px-4 text-sm font-medium text-indigo-200 hover:bg-indigo-500/30 sm:w-auto"
            >
              {DEV_LABELS.apply}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#12151d] text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.time}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.eventType}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.route}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.anonymousId}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.sessionId}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.relatedRequestId}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    {DEV_LABELS.loading}
                  </td>
                </tr>
              )}
              {!loading && (pageData?.content.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    표시할 이벤트가 없습니다.
                  </td>
                </tr>
              )}
              {!loading &&
                pageData?.content.map((item) => (
                  <EventRow
                    key={item.id}
                    item={item}
                    active={selectedId === item.id}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {pageData && pageData.totalPages > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              {DEV_LABELS.pageOf(pageData.page + 1, pageData.totalPages)} ·{" "}
              {DEV_LABELS.totalEvents(pageData.totalElements)}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pageData.page <= 0}
                onClick={() => goPage(pageData.page - 1)}
                className="rounded border border-white/10 px-3 py-1 disabled:opacity-40"
              >
                {DEV_LABELS.previous}
              </button>
              <button
                type="button"
                disabled={pageData.page + 1 >= pageData.totalPages}
                onClick={() => goPage(pageData.page + 1)}
                className="rounded border border-white/10 px-3 py-1 disabled:opacity-40"
              >
                {DEV_LABELS.next}
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId != null && (
        <DeveloperEventDetailPanel
          detail={detail}
          loading={detailLoading}
          onClose={() => setSelectedId(null)}
        />
      )}
    </DeveloperShell>
  );
}

function EventRow({
  item,
  active,
  onSelect,
}: {
  item: DeveloperEventSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-t border-white/5 hover:bg-white/5 ${active ? "bg-indigo-500/10" : "bg-[#171b24]"}`}
    >
      <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-300">
        {formatErrorTime(item.occurredAt)}
      </td>
      <td className="px-3 py-2 text-gray-200">{eventTypeLabelKo(item.eventType)}</td>
      <td className="max-w-[200px] truncate px-3 py-2 font-mono text-gray-300" title={item.route}>
        {item.route}
      </td>
      <td
        className="max-w-[120px] truncate px-3 py-2 font-mono text-gray-400"
        title={item.anonymousId}
      >
        {truncateId(item.anonymousId)}
      </td>
      <td
        className="max-w-[120px] truncate px-3 py-2 font-mono text-gray-400"
        title={item.sessionId}
      >
        {truncateId(item.sessionId)}
      </td>
      <td
        className="max-w-[140px] truncate px-3 py-2 font-mono text-gray-400"
        title={item.relatedRequestId}
      >
        {item.relatedRequestId ? truncateId(item.relatedRequestId) : "-"}
      </td>
    </tr>
  );
}

function toDateTimeLocal(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}
