import { DEV_LABELS } from "../../constants/developerLabels";

interface DeveloperPlaceholderPageProps {
  title: string;
  description: string;
  module: string;
}

/** Developer Console placeholder — 실제 데이터 조회는 다음 단계 */
export default function DeveloperPlaceholderPage({
  title,
  description,
  module,
}: DeveloperPlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h2 className="font-mono text-lg font-semibold text-gray-100">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <div className="rounded-lg border border-dashed border-white/15 bg-[#171b24] p-6">
        <p className="text-sm font-medium text-gray-300">{DEV_LABELS.inProgress}</p>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          `{module}` 모듈 UI가 구성되었습니다. API 연동 및 데이터 표시는 다음 단계에서 구현합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-gray-400">
            timestamp
          </span>
          <span className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-gray-400">
            status badge
          </span>
          <span className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-gray-400">
            requestId
          </span>
          <span className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-gray-400">
            metadata
          </span>
        </div>
      </div>
    </div>
  );
}
