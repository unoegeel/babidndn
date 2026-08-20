import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DeveloperEventDetail } from "../../types/developerEvent";
import { DEV_LABELS } from "../../constants/developerLabels";
import {
  eventTypeLabelKo,
  formatMetadata,
  shouldCollapseMetadata,
} from "../../utils/clientEventLabels";
import { copyText, formatErrorTime } from "../../utils/developerErrorFormat";

interface DeveloperEventDetailPanelProps {
  detail: DeveloperEventDetail | null;
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

export default function DeveloperEventDetailPanel({
  detail,
  loading,
  onClose,
}: DeveloperEventDetailPanelProps) {
  const navigate = useNavigate();
  const [metadataExpanded, setMetadataExpanded] = useState(false);

  const metadataText = detail ? formatMetadata(detail.metadata) : "{}";
  const collapseMetadata = shouldCollapseMetadata(metadataText);

  const goToRelatedRequest = () => {
    if (!detail?.relatedRequestId) return;
    navigate(`/dev/requests?requestId=${encodeURIComponent(detail.relatedRequestId)}`);
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-white/10 bg-[#12151d] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-100">{DEV_LABELS.eventDetail}</h2>
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
        {!loading && !detail && <p className="text-sm text-gray-500">이벤트를 선택하세요.</p>}
        {!loading && detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-gray-500">{DEV_LABELS.eventType}</span>
              <span className="text-gray-200">
                {eventTypeLabelKo(detail.eventType)}
                <span className="ml-2 font-mono text-xs text-gray-500">{detail.eventType}</span>
              </span>

              <span className="text-gray-500">{DEV_LABELS.eventId}</span>
              <CopyButton value={detail.eventId} />

              <span className="text-gray-500">{DEV_LABELS.timestamp}</span>
              <span className="font-mono text-gray-200">{formatErrorTime(detail.occurredAt)}</span>

              <span className="text-gray-500">{DEV_LABELS.route}</span>
              <span className="break-all font-mono text-gray-200">{detail.route}</span>

              <span className="text-gray-500">{DEV_LABELS.anonymousId}</span>
              <CopyButton value={detail.anonymousId} />

              <span className="text-gray-500">{DEV_LABELS.sessionId}</span>
              <CopyButton value={detail.sessionId} />
            </div>

            {detail.relatedRequestId && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {DEV_LABELS.relatedRequestId}
                </p>
                <CopyButton value={detail.relatedRequestId} />
                <button
                  type="button"
                  onClick={goToRelatedRequest}
                  className="mt-2 rounded-md bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-500/30"
                >
                  {DEV_LABELS.viewRelatedRequest}
                </button>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {DEV_LABELS.metadata}
              </p>
              <pre
                className={`overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-gray-300 ${
                  collapseMetadata && !metadataExpanded ? "max-h-48" : "max-h-96"
                }`}
              >
                {metadataText}
              </pre>
              {collapseMetadata && (
                <button
                  type="button"
                  onClick={() => setMetadataExpanded((prev) => !prev)}
                  className="mt-2 text-xs text-indigo-300 hover:text-indigo-200"
                >
                  {metadataExpanded ? "접기" : "전체 보기"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
