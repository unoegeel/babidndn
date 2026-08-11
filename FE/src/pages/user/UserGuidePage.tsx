import { USER_GUIDE_STEPS } from "../../data/userGuideSteps";

function formatStepNumber(step: number): string {
  return String(step).padStart(2, "0");
}

export default function UserGuidePage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-gray-50/30 px-4 py-5">
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
            {/* 2장: 좌우 배치 / 1장: 동일 너비로 가운데 정렬 */}
            <div
              className={
                item.images.length > 1
                  ? "mt-3 grid grid-cols-2 items-start gap-2"
                  : "mt-3 flex justify-center"
              }
            >
              {item.images.map((image) => (
                <div
                  key={image.src}
                  className={`min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 ${
                    item.images.length === 1 ? "w-1/2" : ""
                  }`}
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
