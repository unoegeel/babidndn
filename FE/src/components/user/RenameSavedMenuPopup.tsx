import { useState, type FormEvent } from "react";
import { userPrimaryButtonClassName } from "./userPrimaryButton";

export function RenameSavedMenuPopup({
  initialName,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  initialName: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (customName: string) => void;
}) {
  const [customName, setCustomName] = useState(initialName);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const name = customName.trim();
    if (!name || submitting) return;
    onSubmit(name);
  };

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-menu-title"
        onSubmit={handleSubmit}
        className="flex w-full max-w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="px-5 pt-5">
          <h2 id="rename-menu-title" className="text-base font-bold text-gray-900">
            나만의 메뉴명 수정
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            새로운 나만의 메뉴명을 입력해 주세요.
          </p>
        </div>

        <div className="px-5 py-4">
          <input
            type="text"
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            maxLength={100}
            autoFocus
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-base text-gray-900 placeholder:text-gray-300 focus:border-gray-400 focus:outline-none"
          />
          {error ? <p className="mt-2 text-[11px] font-semibold text-red-500">{error}</p> : null}
        </div>

        <div className="flex border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3.5 text-sm font-bold text-gray-500 cursor-pointer disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting || !customName.trim()}
            className={`flex-1 border-l border-gray-100 py-3.5 text-sm font-bold cursor-pointer ${userPrimaryButtonClassName}`}
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
