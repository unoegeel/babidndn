import type { DeveloperErrorDetail } from "../../types/developerError";
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

export default function DeveloperErrorDetailPanel({
  detail,
  loading,
  onClose,
}: DeveloperErrorDetailPanelProps) {
  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-white/10 bg-[#12151d] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-100">Error Detail</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-white/10 px-2 py-1 text-xs text-gray-300 hover:bg-white/5"
        >
          Close
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && !detail && <p className="text-sm text-gray-500">오류를 선택하세요.</p>}
        {!loading && detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-gray-500">Source</span>
              <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${sourceBadgeClass(detail.source)}`}>
                {detail.source}
              </span>

              <span className="text-gray-500">Timestamp</span>
              <span className="font-mono text-gray-200">{formatErrorTime(detail.createdAt)}</span>

              <span className="text-gray-500">Route</span>
              <span className="font-mono text-gray-200">{detail.route ?? "-"}</span>

              <span className="text-gray-500">Method</span>
              <span className="font-mono text-gray-200">{detail.method ?? "-"}</span>

              <span className="text-gray-500">Status</span>
              <span className="font-mono text-gray-200">{statusLabel(detail.status)}</span>

              <span className="text-gray-500">Error</span>
              <span className="text-gray-200">{detail.errorType ?? "-"}</span>

              <span className="text-gray-500">Browser</span>
              <span className="text-gray-200">{detail.browser ?? "-"}</span>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Request ID</p>
              <CopyButton value={detail.requestId} label="Copy" />
              <p className="mt-1 text-[11px] text-gray-600">
                {detail.source === "FRONTEND"
                  ? "POST /api/client-errors 요청의 tracking requestId"
                  : "해당 Backend HTTP 요청의 requestId"}
              </p>
            </div>

            {detail.relatedRequestId && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Related Request ID</p>
                <CopyButton value={detail.relatedRequestId} label="Copy" />
                <p className="mt-1 text-[11px] text-gray-600">연관 Backend API 요청의 requestId</p>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Message</p>
              <pre className="whitespace-pre-wrap break-words rounded bg-black/30 p-3 text-xs text-gray-200">
                {detail.message ?? detail.messageSummary ?? "-"}
              </pre>
            </div>

            {detail.stack && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Stack Trace</p>
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
