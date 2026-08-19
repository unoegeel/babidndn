import DeveloperShell from "../../components/developer/DeveloperShell";

interface ModuleCardProps {
  title: string;
  description: string;
  status: "Ready" | "Planned";
}

function ModuleCard({ title, description, status }: ModuleCardProps) {
  const ready = status === "Ready";
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
          {status}
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
          <h2 className="text-lg font-semibold text-gray-100">Overview</h2>
          <p className="mt-1 text-sm text-gray-500">
            1~3단계 Observability 데이터를 조회할 Developer Console 기반입니다.
            실제 데이터 연결은 다음 단계에서 진행합니다.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <ModuleCard
            title="Errors"
            description="Frontend/Backend structured error log 조회 (준비됨)"
            status="Ready"
          />
          <ModuleCard
            title="Requests"
            description="Request ID 기반 access log / trace 조회 (준비됨)"
            status="Ready"
          />
          <ModuleCard
            title="Events"
            description="User Event DB 조회 및 필터 (준비됨)"
            status="Ready"
          />
          <ModuleCard
            title="Analytics"
            description="주문 퍼널·메뉴·옵션 분석 (준비됨)"
            status="Ready"
          />
        </section>
      </div>
    </DeveloperShell>
  );
}
