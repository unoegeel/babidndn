import { useState, type FormEvent } from "react";
import type { CategoryResponse } from "../../../types/api";

/** 카테고리 관리 모달 (추가 / 이름 변경 / 삭제) */
export function CategoryManageModal({
  categories,
  onClose,
  onAdd,
  onRename,
  onDelete,
}: {
  categories: CategoryResponse[];
  onClose: () => void;
  /** 추가 성공 여부 반환 */
  onAdd: (name: string) => Promise<boolean>;
  /** 이름 변경 성공 여부 반환 */
  onRename: (id: number, name: string) => Promise<boolean>;
  /** 삭제 성공 여부 반환 */
  onDelete: (id: number) => Promise<boolean>;
}) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 이름 변경 중인 카테고리
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const validateName = (name: string, excludeId?: number): string | null => {
    if (!name) return "카테고리 이름을 입력해 주세요.";
    if (categories.some((c) => c.id !== excludeId && c.name === name)) {
      return "이미 있는 카테고리입니다.";
    }
    return null;
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const trimmed = newName.trim();
    const invalid = validateName(trimmed);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    const ok = await onAdd(trimmed);
    setBusy(false);
    if (ok) {
      setNewName("");
      setError(null);
    } else {
      setError("카테고리를 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleRename = async (id: number) => {
    if (busy) return;
    const trimmed = editingName.trim();
    const invalid = validateName(trimmed, id);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    const ok = await onRename(id, trimmed);
    setBusy(false);
    if (ok) {
      setEditingId(null);
      setError(null);
    } else {
      setError("카테고리 이름을 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleDelete = async (category: CategoryResponse) => {
    if (busy) return;
    if (
      !window.confirm(
        `'${category.name}' 카테고리를 삭제할까요?\n카테고리에 메뉴가 남아 있으면 삭제되지 않을 수 있습니다.`,
      )
    ) {
      return;
    }
    setBusy(true);
    await onDelete(category.id);
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-[20px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-[25px] bg-canvas p-[24px]"
      >
        <h2 className="text-[22px] font-medium text-black">
          카테고리 관리
        </h2>

        {/* 기존 카테고리 목록 (이름 변경 / 삭제) */}
        <ul className="mt-[20px] flex max-h-[280px] flex-col gap-[8px] overflow-y-auto">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-[8px]">
              {editingId === c.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => {
                      setEditingName(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleRename(c.id);
                      }
                    }}
                    maxLength={12}
                    className="h-[40px] min-w-0 flex-1 rounded-[10px] border border-black bg-canvas px-[14px] text-[15px] outline-none"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRename(c.id)}
                    className="h-[40px] shrink-0 rounded-[10px] bg-black px-[14px] text-[14px] font-medium text-canvas disabled:opacity-40"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setError(null);
                    }}
                    className="h-[40px] shrink-0 rounded-[10px] border border-black/50 bg-canvas px-[14px] text-[14px] font-medium text-black"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-black">
                    {c.name}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEditingId(c.id);
                      setEditingName(c.name);
                      setError(null);
                    }}
                    className="h-[40px] shrink-0 rounded-[10px] border border-black/50 bg-canvas px-[14px] text-[14px] font-medium text-black disabled:opacity-40"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete(c)}
                    className="h-[40px] shrink-0 rounded-[10px] border border-danger bg-canvas px-[14px] text-[14px] font-medium text-danger disabled:opacity-40"
                  >
                    삭제
                  </button>
                </>
              )}
            </li>
          ))}
          {categories.length === 0 && (
            <li className="text-[14px] text-black/50">등록된 카테고리가 없습니다.</li>
          )}
        </ul>

        {/* 새 카테고리 추가 */}
        <form onSubmit={handleAdd} className="mt-[20px] flex gap-[8px]">
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setError(null);
            }}
            placeholder="새 카테고리 (예: 사이드)"
            maxLength={12}
            className="h-[48px] min-w-0 flex-1 rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[15px] outline-none placeholder:text-black/50 focus:border-black"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-[48px] shrink-0 rounded-[10px] bg-black px-[20px] text-[15px] font-medium text-canvas disabled:opacity-60"
          >
            추가
          </button>
        </form>
        {error && (
          <p className="mt-[8px] text-[14px] font-medium text-danger">{error}</p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-[20px] h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas text-[15px] font-medium text-black"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
