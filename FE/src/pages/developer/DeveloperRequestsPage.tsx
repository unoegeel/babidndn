import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DeveloperShell from "../../components/developer/DeveloperShell";
import DeveloperRequestDetailPanel from "../../components/developer/DeveloperRequestDetailPanel";
import { DEV_LABELS } from "../../constants/developerLabels";
import { developerRequestService } from "../../services/developer/requestService";
import type {
  DeveloperRequestDetail,
  DeveloperRequestPage,
  DeveloperRequestQuery,
  DeveloperRequestSummary,
} from "../../types/developerRequest";
import {
  durationSpeedClass,
  formatDuration,
  formatErrorTime,
  formatHttpStatus,
  statusBadgeClass,
} from "../../utils/developerErrorFormat";

const PAGE_SIZE = 50;

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export default function DeveloperRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRequestId = searchParams.get("requestId") ?? "";

  const [query, setQuery] = useState<DeveloperRequestQuery>({
    page: 0,
    size: PAGE_SIZE,
    requestId: initialRequestId || undefined,
  });
  const [draftRequestId, setDraftRequestId] = useState(initialRequestId);
  const [draftPath, setDraftPath] = useState("");
  const [pageData, setPageData] = useState<DeveloperRequestPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DeveloperRequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const requestId = searchParams.get("requestId");
    if (requestId) {
      queueMicrotask(() => {
        setDraftRequestId(requestId);
        setQuery((prev) => ({ ...prev, requestId, page: 0 }));
      });
    }
  }, [searchParams]);

  const loadList = useCallback(async (params: DeveloperRequestQuery) => {
    await Promise.resolve();
    try {
      setLoading(true);
      setError(null);
      const data = await developerRequestService.list(params);
      setPageData(data);
    } catch (err) {
      console.error(err);
      setError("요청 목록을 불러오지 못했습니다.");
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
        const data = await developerRequestService.detail(selectedId);
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
    const requestId = draftRequestId.trim() || undefined;
    setQuery((prev) => ({
      ...prev,
      requestId,
      path: draftPath.trim() || undefined,
      page: 0,
    }));
    if (requestId) {
      setSearchParams({ requestId });
    } else {
      setSearchParams({});
    }
  };

  const updateFilter = (patch: Partial<DeveloperRequestQuery>) => {
    setQuery((prev) => ({ ...prev, ...patch, page: 0 }));
  };

  const goPage = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  return (
    <DeveloperShell>
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">{DEV_LABELS.requestMonitoring}</h2>
          <p className="text-sm text-gray-500">개별 HTTP 요청을 requestId로 추적합니다. 집계 성능은 「분석 › API 성능」을 사용하세요.</p>
        </div>

        <div className="space-y-3 rounded-lg border border-white/10 bg-[#171b24] p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setQuery((prev) => ({
                  ...prev,
                  status: "500",
                  minDuration: undefined,
                  page: 0,
                }))
              }
              className={`rounded-md px-3 py-1.5 text-xs ${
                query.status === "500" && !query.minDuration
                  ? "bg-indigo-500/30 text-indigo-100"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              HTTP 500
            </button>
            <button
              type="button"
              onClick={() =>
                setQuery((prev) => ({
                  ...prev,
                  minDuration: "1000",
                  status: undefined,
                  page: 0,
                }))
              }
              className={`rounded-md px-3 py-1.5 text-xs ${
                query.minDuration === "1000"
                  ? "bg-indigo-500/30 text-indigo-100"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              느린 요청 (≥1s
            </button>
            <button
              type="button"
              onClick={() =>
                setQuery((prev) => ({
                  ...prev,
                  status: undefined,
                  minDuration: undefined,
                  page: 0,
                }))
              }
              className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/10"
            >
              빠른 필터 해제
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto_auto]">
            <input
              value={draftRequestId}
              onChange={(e) => setDraftRequestId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="요청 ID 검색..."
              className="rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-400/40"
            />
            <select
              value={query.method ?? ""}
              onChange={(e) => updateFilter({ method: e.target.value || undefined })}
              className="rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100"
            >
              <option value="">전체 메서드</option>
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              value={query.status ?? ""}
              onChange={(e) => updateFilter({ status: e.target.value || undefined })}
              placeholder="상태"
              className="w-24 rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100"
            />
            <input
              value={draftPath}
              onChange={(e) => setDraftPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="경로"
              className="rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100"
            />
            <input
              type="datetime-local"
              value={toDateTimeLocal(query.from)}
              onChange={(e) => updateFilter({ from: fromDateTimeLocal(e.target.value) })}
              className="rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100"
              title="시작 기간"
            />
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-md bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-200 hover:bg-indigo-500/30"
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
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.method}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.path}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.status}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.duration}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.requestId}</th>
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
                    표시할 요청이 없습니다.
                  </td>
                </tr>
              )}
              {!loading &&
                pageData?.content.map((item) => (
                  <RequestRow
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
              {DEV_LABELS.totalRequests(pageData.totalElements)}
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
        <DeveloperRequestDetailPanel
          detail={detail}
          loading={detailLoading}
          onClose={() => setSelectedId(null)}
        />
      )}
    </DeveloperShell>
  );
}

function RequestRow({
  item,
  active,
  onSelect,
}: {
  item: DeveloperRequestSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-t border-white/5 hover:bg-white/5 ${active ? "bg-indigo-500/10" : "bg-[#171b24]"}`}
    >
      <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-300">
        {formatErrorTime(item.timestamp)}
      </td>
      <td className="px-3 py-2 font-mono text-gray-300">{item.method}</td>
      <td className="max-w-[240px] truncate px-3 py-2 font-mono text-gray-300" title={item.path}>
        {item.path}
      </td>
      <td className="px-3 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(item.status)}`}
        >
          {formatHttpStatus(item.status)}
        </span>
      </td>
      <td className={`px-3 py-2 font-mono ${durationSpeedClass(item.durationMs)}`}>
        {formatDuration(item.durationMs)}
      </td>
      <td className="max-w-[160px] truncate px-3 py-2 font-mono text-gray-400" title={item.requestId}>
        {item.requestId}
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
