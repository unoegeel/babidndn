import { USER_GUIDE_STEPS } from "../../data/userGuideSteps";

function formatStepNumber(step: number): string {
  return String(step).padStart(2, "0");
}

export default function UserGuidePage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-gray-50/30 px-4 py-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900">사용 가이드</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500">
          바비오더로 주문하는 방법을 단계별로 안내합니다.
        </p>
      </div>

      <ol className="space-y-3 pb-2">
        {USER_GUIDE_STEPS.map((item) => (
          <li
            key={item.step}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <p className="text-[11px] font-semibold tabular-nums text-gray-400">
              {formatStepNumber(item.step)}
            </p>
            <h3 className="mt-1 text-sm font-bold text-gray-900">{item.title}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500">
              {item.description}
            </p>
            <div className="mt-3 space-y-2">
              {item.images.map((image) => (
                <div
                  key={image.src}
                  className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-full max-w-full object-contain"
                  />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
