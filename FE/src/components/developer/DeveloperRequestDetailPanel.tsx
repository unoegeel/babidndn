import { useState } from "react";
import type { DeveloperRequestDetail } from "../../types/developerRequest";
import { DEV_LABELS } from "../../constants/developerLabels";
import {
  copyText,
  formatDuration,
  formatErrorTime,
  formatHttpStatus,
  statusBadgeClass,
} from "../../utils/developerErrorFormat";

interface DeveloperRequestDetailPanelProps {
  detail: DeveloperRequestDetail | null;
  loading: boolean;
  onClose: () => void;
}

function CopyButton({ value }: { value?: string }) {
  const [copied, setCopied] = useState(false);

  if (!value) return <span className="text-xs text-gray-500">-</span>;

  const handleCopy = async () => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="break-all rounded bg-black/30 px-2 py-1 text-xs text-gray-200">{value}</code>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="shrink-0 rounded border border-white/10 px-2 py-1 text-[11px] text-gray-300 hover:bg-white/5"
      >
        {copied ? DEV_LABELS.copied : DEV_LABELS.copy}
      </button>
    </div>
  );
}

export default function DeveloperRequestDetailPanel({
  detail,
  loading,
  onClose,
}: DeveloperRequestDetailPanelProps) {
  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-white/10 bg-[#12151d] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-100">{DEV_LABELS.requestDetail}</h2>
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
        {!loading && !detail && <p className="text-sm text-gray-500">요청을 선택하세요.</p>}
        {!loading && detail && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {DEV_LABELS.requestId}
              </p>
              <CopyButton value={detail.requestId} />
            </div>

            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-gray-500">{DEV_LABELS.timestamp}</span>
              <span className="font-mono text-gray-200">{formatErrorTime(detail.timestamp)}</span>

              <span className="text-gray-500">{DEV_LABELS.method}</span>
              <span className="font-mono text-gray-200">{detail.method}</span>

              <span className="text-gray-500">{DEV_LABELS.path}</span>
              <span className="break-all font-mono text-gray-200">{detail.path}</span>

              <span className="text-gray-500">{DEV_LABELS.status}</span>
              <span
                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(detail.status)}`}
              >
                {formatHttpStatus(detail.status)}
              </span>

              <span className="text-gray-500">{DEV_LABELS.duration}</span>
              <span className="font-mono text-gray-200">{formatDuration(detail.durationMs)}</span>

              {detail.userAgent && (
                <>
                  <span className="text-gray-500">{DEV_LABELS.browser}</span>
                  <span className="break-all text-xs text-gray-300">{detail.userAgent}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
