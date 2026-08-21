import { useCallback, useEffect, useState } from "react";
import DeveloperShell from "../../components/developer/DeveloperShell";
import DeveloperErrorDetailPanel from "../../components/developer/DeveloperErrorDetailPanel";
import { DEV_LABELS, sourceLabelKo } from "../../constants/developerLabels";
import { developerErrorService } from "../../services/developer/errorService";
import type {
  DeveloperErrorDetail,
  DeveloperErrorPage,
  DeveloperErrorQuery,
  DeveloperErrorSource,
  DeveloperErrorSummary,
} from "../../types/developerError";
import {
  formatErrorTime,
  sourceBadgeClass,
  statusLabel,
} from "../../utils/developerErrorFormat";

const PAGE_SIZE = 50;

export default function DeveloperErrorsPage() {
  const [query, setQuery] = useState<DeveloperErrorQuery>({ page: 0, size: PAGE_SIZE });
  const [draftSearch, setDraftSearch] = useState("");
  const [pageData, setPageData] = useState<DeveloperErrorPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DeveloperErrorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async (params: DeveloperErrorQuery) => {
    await Promise.resolve();
    try {
      setLoading(true);
      setError(null);
      const data = await developerErrorService.list(params);
      setPageData(data);
    } catch (err) {
      console.error(err);
      setError("오류 목록을 불러오지 못했습니다.");
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

  if (!selectedId && detail !== null) {
    setDetail(null);
  }

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void (async () => {
      try {
        setDetailLoading(true);
        const data = await developerErrorService.detail(selectedId);
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
      search: draftSearch.trim() || undefined,
      page: 0,
    }));
  };

  const updateFilter = (patch: Partial<DeveloperErrorQuery>) => {
    setQuery((prev) => ({ ...prev, ...patch, page: 0 }));
  };

  const goPage = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  return (
    <DeveloperShell>
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">{DEV_LABELS.errorMonitoring}</h2>
          <p className="text-sm text-gray-500">프론트엔드/백엔드 구조화 오류 모니터링</p>
        </div>

        <div className="grid gap-3 rounded-lg border border-white/10 bg-[#171b24] p-4 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="메시지, 경로, 요청 ID 검색..."
            className="rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-400/40"
          />
          <select
            value={query.source ?? ""}
            onChange={(e) => updateFilter({ source: e.target.value as DeveloperErrorSource | "" })}
            className="rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100"
          >
            <option value="">{DEV_LABELS.allSources}</option>
            <option value="FRONTEND">{DEV_LABELS.frontend}</option>
            <option value="BACKEND">{DEV_LABELS.backend}</option>
          </select>
          <input
            value={query.status ?? ""}
            onChange={(e) => updateFilter({ status: e.target.value || undefined })}
            placeholder={DEV_LABELS.status}
            className="w-28 rounded-md border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-gray-100"
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

        {error && <p className="text-sm text-rose-300">{error}</p>}

        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#12151d] text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.time}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.source}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.status}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.route}</th>
                <th className="px-3 py-2 font-semibold">{DEV_LABELS.error}</th>
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
                    표시할 오류가 없습니다.
                  </td>
                </tr>
              )}
              {!loading && pageData?.content.map((item) => (
                <ErrorRow
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
              {DEV_LABELS.totalErrors(pageData.totalElements)}
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

      {selectedId && (
        <DeveloperErrorDetailPanel
          detail={detail}
          loading={detailLoading}
          onClose={() => setSelectedId(null)}
        />
      )}
    </DeveloperShell>
  );
}

function ErrorRow({
  item,
  active,
  onSelect,
}: {
  item: DeveloperErrorSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-t border-white/5 hover:bg-white/5 ${active ? "bg-indigo-500/10" : "bg-[#171b24]"}`}
    >
      <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-300">{formatErrorTime(item.createdAt)}</td>
      <td className="px-3 py-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sourceBadgeClass(item.source)}`}>
          {sourceLabelKo(item.source)}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-gray-300">{statusLabel(item.status)}</td>
      <td className="max-w-[220px] truncate px-3 py-2 font-mono text-gray-300" title={item.route}>{item.route ?? "-"}</td>
      <td className="max-w-[260px] truncate px-3 py-2 text-gray-200" title={item.messageSummary}>
        {item.errorType ?? "-"} · {item.messageSummary ?? "-"}
      </td>
      <td className="max-w-[160px] truncate px-3 py-2 font-mono text-gray-400" title={item.requestId}>
        {item.requestId ?? "-"}
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
