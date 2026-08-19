import DeveloperShell from "../../components/developer/DeveloperShell";
import { DEV_LABELS } from "../../constants/developerLabels";

interface ModuleCardProps {
  title: string;
  description: string;
  status: "ready" | "planned";
}

function ModuleCard({ title, description, status }: ModuleCardProps) {
  const ready = status === "ready";
  return (
    <div className="rounded-lg border border-white/10 bg-[#171b24] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            ready
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-gray-500/15 text-gray-400"
          }`}
        >
          {ready ? DEV_LABELS.ready : DEV_LABELS.planned}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-gray-500">{description}</p>
    </div>
  );
}

export default function DeveloperOverviewPage() {
  return (
    <DeveloperShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-100">{DEV_LABELS.overview}</h2>
          <p className="mt-1 text-sm text-gray-500">
            1~3단계에서 구축한 운영 관측 데이터를 조회하는 개발자 전용 콘솔입니다.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <ModuleCard
            title={DEV_LABELS.errors}
            description="프론트엔드/백엔드 오류 조회"
            status="ready"
          />
          <ModuleCard
            title={DEV_LABELS.requests}
            description="요청 ID 기반 API 요청 추적"
            status="ready"
          />
          <ModuleCard
            title={DEV_LABELS.events}
            description="사용자 행동 이벤트 조회"
            status="planned"
          />
          <ModuleCard
            title={DEV_LABELS.analytics}
            description="주문 퍼널 및 사용자 분석"
            status="planned"
          />
        </section>
      </div>
    </DeveloperShell>
  );
}
