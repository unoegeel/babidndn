import { useNavigate } from "react-router-dom";
import type { DeveloperErrorDetail } from "../../types/developerError";
import { DEV_LABELS, sourceLabelKo } from "../../constants/developerLabels";
import { copyText, formatErrorTime, sourceBadgeClass, statusLabel } from "../../utils/developerErrorFormat";

interface DeveloperErrorDetailPanelProps {
  detail: DeveloperErrorDetail | null;
  loading: boolean;
  onClose: () => void;
}

function CopyButton({ value, label }: { value?: string; label: string }) {
  if (!value) return <span className="text-xs text-gray-500">-</span>;

  return (
    <div className="flex items-center gap-2">
      <code className="break-all rounded bg-black/30 px-2 py-1 text-xs text-gray-200">{value}</code>
      <button
        type="button"
        onClick={() => void copyText(value)}
        className="shrink-0 rounded border border-white/10 px-2 py-1 text-[11px] text-gray-300 hover:bg-white/5"
      >
        {label}
      </button>
    </div>
  );
}

function resolveTraceRequestId(detail: DeveloperErrorDetail): string | undefined {
  if (detail.source === "FRONTEND") {
    return detail.relatedRequestId ?? detail.requestId;
  }
  return detail.requestId;
}

export default function DeveloperErrorDetailPanel({
  detail,
  loading,
  onClose,
}: DeveloperErrorDetailPanelProps) {
  const navigate = useNavigate();
  const traceRequestId = detail ? resolveTraceRequestId(detail) : undefined;

  const goToRequest = () => {
    if (!traceRequestId) return;
    navigate(`/dev/requests?requestId=${encodeURIComponent(traceRequestId)}`);
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-white/10 bg-[#12151d] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-100">{DEV_LABELS.errorDetail}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-white/10 px-2 py-1 text-xs text-gray-300 hover:bg-white/5"
        >
          {DEV_LABELS.close}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading && <p className="text-sm text-gray-500">{DEV_LABELS.loading}</p>}
        {!loading && !detail && <p className="text-sm text-gray-500">오류를 선택하세요.</p>}
        {!loading && detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-gray-500">{DEV_LABELS.source}</span>
              <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${sourceBadgeClass(detail.source)}`}>
                {sourceLabelKo(detail.source)}
              </span>

              <span className="text-gray-500">{DEV_LABELS.timestamp}</span>
              <span className="font-mono text-gray-200">{formatErrorTime(detail.createdAt)}</span>

              <span className="text-gray-500">{DEV_LABELS.route}</span>
              <span className="font-mono text-gray-200">{detail.route ?? "-"}</span>

              <span className="text-gray-500">{DEV_LABELS.method}</span>
              <span className="font-mono text-gray-200">{detail.method ?? "-"}</span>

              <span className="text-gray-500">{DEV_LABELS.status}</span>
              <span className="font-mono text-gray-200">{statusLabel(detail.status)}</span>

              <span className="text-gray-500">{DEV_LABELS.error}</span>
              <span className="text-gray-200">{detail.errorType ?? "-"}</span>

              <span className="text-gray-500">{DEV_LABELS.browser}</span>
              <span className="text-gray-200">{detail.browser ?? "-"}</span>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {DEV_LABELS.requestId}
              </p>
              <CopyButton value={detail.requestId} label={DEV_LABELS.copy} />
              <p className="mt-1 text-[11px] text-gray-600">
                {detail.source === "FRONTEND"
                  ? "POST /api/client-errors 요청의 tracking requestId"
                  : "해당 Backend HTTP 요청의 requestId"}
              </p>
            </div>

            {detail.relatedRequestId && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {DEV_LABELS.relatedRequestId}
                </p>
                <CopyButton value={detail.relatedRequestId} label={DEV_LABELS.copy} />
                <p className="mt-1 text-[11px] text-gray-600">연관 Backend API 요청의 requestId</p>
              </div>
            )}

            {traceRequestId && (
              <button
                type="button"
                onClick={goToRequest}
                className="rounded-md bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-500/30"
              >
                {DEV_LABELS.viewRequest}
              </button>
            )}

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {DEV_LABELS.message}
              </p>
              <pre className="whitespace-pre-wrap break-words rounded bg-black/30 p-3 text-xs text-gray-200">
                {detail.message ?? detail.messageSummary ?? "-"}
              </pre>
            </div>

            {detail.stack && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {DEV_LABELS.stackTrace}
                </p>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-gray-300">
                  {detail.stack}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
