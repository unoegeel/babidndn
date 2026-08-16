type BusinessInfoModalProps = {
  open: boolean;
  onClose: () => void;
};

const FIELDS: { label: string; value: string }[] = [
  { label: "상호명", value: "바비든든" },
  { label: "대표자명", value: "" },
  { label: "사업자등록번호", value: "553-03-03083" },
  { label: "사업장 주소", value: "경기 용인시 처인구 모현읍 외대로 81 후생관 1층" },
  { label: "전화번호", value: "010-4261-0980" },
];

export function BusinessInfoModal({ open, onClose }: BusinessInfoModalProps) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="business-info-title"
        className="flex max-h-full w-full max-w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 overflow-y-auto px-5 pt-5 pb-2">
          <h2 id="business-info-title" className="text-base font-bold text-gray-900">
            사업장 정보
          </h2>
          <dl className="mt-4 space-y-3">
            {FIELDS.map((field) => (
              <div key={field.label}>
                <dt className="text-[11px] font-semibold text-gray-400">{field.label}</dt>
                <dd className="mt-0.5 min-h-[1rem] break-words text-xs font-bold leading-relaxed text-gray-800">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex shrink-0 justify-end border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-black px-4 py-2 text-[12px] font-bold text-white cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
