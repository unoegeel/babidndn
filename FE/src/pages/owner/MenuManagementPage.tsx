import { useEffect, useRef, useState, type FormEvent } from "react";
import AdminShell from "../../components/AdminShell";
import Toggle from "../../components/Toggle";
import { useAdminData } from "../../store/AdminDataContext";
import type { Menu, MenuCategory } from "../../types/admin";
import type { CategoryResponse } from "../../types/api";

/** 우측 패널 상태: 닫힘 | 신규 등록 | 특정 메뉴 수정 */
type PanelState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; menuId: string };

export default function MenuManagementPage() {
  const {
    categories,
    categoryList,
    menus,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleMenuStatus,
    addMenu,
    updateMenu,
    deleteMenu,
    getMenuDetail,
  } = useAdminData();
  const [tab, setTab] = useState<MenuCategory>(categories[0] ?? "");
  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  // 수정 대상 메뉴의 상세 정보 (토핑 여부 등은 목록에 없어 서버에서 조회)
  const [editing, setEditing] = useState<Menu | null>(null);

  // 서버에서 카테고리를 받기 전이거나 선택한 탭이 사라진 경우 첫 카테고리 사용
  const activeTab = categories.includes(tab) ? tab : categories[0] ?? "";

  // 수정 패널이 열리면 해당 메뉴 상세 조회
  useEffect(() => {
    if (panel.mode !== "edit") return;
    let cancelled = false;
    getMenuDetail(panel.menuId)
      .then((detail) => {
        if (!cancelled) setEditing(detail);
      })
      .catch((err) => {
        console.error("메뉴 상세 조회 실패:", err);
        if (!cancelled) {
          alert("메뉴 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          setEditing(null);
          setPanel({ mode: "closed" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [panel, getMenuDetail]);

  const filtered = menus.filter((m) => m.category === activeTab);

  const closePanel = () => {
    setEditing(null);
    setPanel({ mode: "closed" });
  };

  const openCreatePanel = () => {
    setEditing(null);
    setPanel({ mode: "create" });
  };

  const openEditPanel = (menuId: string) => {
    setEditing(null);
    setPanel({ mode: "edit", menuId });
  };

  return (
    <AdminShell>
      <div className="flex h-full flex-col p-[20px] md:p-[32px]">
        {/* 헤더 */}
        <div className="mb-[24px] flex flex-wrap items-center justify-between gap-[12px]">
          <h1 className="text-[24px] font-bold text-black">메뉴 관리</h1>
          <button
            onClick={openCreatePanel}
            className="h-[48px] rounded-[10px] border border-black/50 bg-black px-[20px] text-[15px] font-medium tracking-[1px] text-white"
          >
            + 새 메뉴 등록
          </button>
        </div>

        {/* 카테고리 탭 */}
        <div className="mb-[24px] flex flex-wrap gap-[12px] md:gap-[16px]">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => {
                setTab(c);
                // 다른 카테고리로 이동하면 열려 있던 수정 패널은 닫는다
                if (panel.mode === "edit") closePanel();
              }}
              className={`h-[48px] rounded-[10px] border border-black/50 px-[24px] text-[15px] font-medium tracking-[1px] ${
                activeTab === c ? "bg-black text-white" : "bg-canvas text-black"
              }`}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            className="h-[48px] rounded-[10px] border border-dashed border-black/50 bg-canvas px-[24px] text-[15px] font-medium tracking-[1px] text-black/70 hover:border-black hover:text-black"
          >
            카테고리 관리
          </button>
        </div>

        {/* 본문: 메뉴 그리드 + (등록 폼) */}
        {/* 좁은 화면(태블릿 세로 등)에서는 폼이 아래로 내려가도록 세로 배치 */}
        <div className="flex min-h-0 flex-1 flex-col gap-[16px] overflow-auto lg:flex-row lg:gap-[24px] lg:overflow-hidden">
          <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] content-start gap-[16px] pr-[4px] md:gap-[24px] lg:overflow-auto">
            {filtered.map((menu) => (
              <div
                key={menu.id}
                role="button"
                tabIndex={0}
                onClick={() => openEditPanel(menu.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEditPanel(menu.id);
                  }
                }}
                className={`flex w-full cursor-pointer flex-col rounded-[25px] border bg-canvas p-[20px] transition-shadow ${
                  editing?.id === menu.id
                    ? "border-black ring-2 ring-black/40"
                    : "border-black/50"
                }`}
              >
                {/* 사진 */}
                <div className="flex h-[160px] flex-col items-center justify-center gap-[6px] rounded-[10px] border border-dashed border-black/50 text-black/50">
                  <PhotoIcon />
                  <span className="text-[18px] font-medium tracking-[1px]">사진</span>
                </div>

                <p className="mt-[20px] text-[28px] font-medium tracking-[1.5px] text-black">
                  {menu.name}
                </p>
                <p className="mt-[6px] text-[18px] font-medium tracking-[1px] text-black">
                  {menu.price.toLocaleString()}원
                </p>

                {/* 판매 상태 토글은 카드 클릭(메뉴 수정)과 분리 */}
                <div
                  className="mt-[16px] flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[18px] font-medium tracking-[1px] text-black">
                    {menu.status === "판매중" ? "판매 중" : "품절"}
                  </span>
                  <Toggle
                    checked={menu.status === "판매중"}
                    onChange={() => toggleMenuStatus(menu.id)}
                    label={`${menu.name} 판매 상태`}
                  />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-[15px] text-black/50">이 카테고리에 등록된 메뉴가 없습니다.</p>
            )}
          </div>

          {panel.mode === "create" && (
            <MenuForm
              key="create"
              mode="create"
              categories={categories}
              defaultCategory={activeTab}
              onClose={closePanel}
              onSubmit={(values) => {
                void addMenu({ ...values, status: "판매중" });
                closePanel();
              }}
            />
          )}

          {editing && (
            <MenuForm
              key={editing.id}
              mode="edit"
              menu={editing}
              categories={categories}
              defaultCategory={editing.category}
              onClose={closePanel}
              onSubmit={(values) => {
                void updateMenu(editing.id, values);
                setTab(values.category);
                closePanel();
              }}
              onDelete={() => {
                if (
                  !window.confirm(
                    `'${editing.name}' 메뉴를 삭제할까요?\n삭제 후에는 되돌릴 수 없습니다.`,
                  )
                ) {
                  return;
                }
                void deleteMenu(editing.id).then((ok) => {
                  if (ok) closePanel();
                });
              }}
            />
          )}
        </div>
      </div>

      {categoryModalOpen && (
        <CategoryManageModal
          categories={categoryList}
          onClose={() => setCategoryModalOpen(false)}
          onAdd={async (name) => {
            if (!(await addCategory(name))) return false;
            // 추가한 카테고리를 바로 선택된 탭으로 전환
            setTab(name.trim());
            return true;
          }}
          onRename={async (id, name) => {
            const oldName = categoryList.find((c) => c.id === id)?.name;
            const ok = await updateCategory(id, name);
            // 이름이 바뀐 카테고리를 보고 있었다면 탭 선택 유지
            if (ok && oldName && tab === oldName) setTab(name.trim());
            return ok;
          }}
          onDelete={(id) => deleteCategory(id)}
        />
      )}
    </AdminShell>
  );
}

/** 카테고리 관리 모달 (추가 / 이름 변경 / 삭제) */
function CategoryManageModal({
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
        <h2 className="text-[22px] font-medium tracking-[1.5px] text-black">
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
                    className="h-[40px] min-w-0 flex-1 rounded-[10px] border border-black bg-canvas px-[14px] text-[15px] tracking-[1px] outline-none"
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
                  <span className="min-w-0 flex-1 truncate text-[16px] font-medium tracking-[1px] text-black">
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
            className="h-[48px] min-w-0 flex-1 rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[15px] tracking-[1px] outline-none placeholder:text-black/50 focus:border-black"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-[48px] shrink-0 rounded-[10px] bg-black px-[20px] text-[15px] font-medium tracking-[1px] text-canvas disabled:opacity-60"
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
          className="mt-[20px] h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas text-[15px] font-medium tracking-[1px] text-black"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

/** 신규 등록 / 기존 메뉴 수정 공용 폼 */
function MenuForm({
  mode,
  menu,
  categories,
  defaultCategory,
  onClose,
  onSubmit,
  onDelete,
}: {
  mode: "create" | "edit";
  menu?: Menu;
  categories: MenuCategory[];
  defaultCategory: MenuCategory;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    price: number;
    category: MenuCategory;
    toppingAvailable: boolean;
  }) => void;
  /** 수정 모드에서만 사용하는 메뉴 삭제 핸들러 */
  onDelete?: () => void;
}) {
  const [name, setName] = useState(menu?.name ?? "");
  const [price, setPrice] = useState(menu ? String(menu.price) : "");
  const [category, setCategory] = useState<MenuCategory>(
    menu?.category ?? defaultCategory,
  );
  const [topping, setTopping] = useState(
    menu?.toppingAvailable === false ? "불가능" : "가능",
  );

  // 좁은 화면에서는 폼이 목록 아래에 배치되므로, 열릴 때 화면 안으로 스크롤
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.scrollIntoView({ block: "start" });
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    onSubmit({
      name: name.trim(),
      price: Number(price),
      category,
      toppingAvailable: topping === "가능",
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex w-full shrink-0 flex-col rounded-[25px] border border-black/50 bg-canvas p-[24px] lg:w-[340px] lg:overflow-auto"
    >
      <h2 className="text-[26px] font-medium tracking-[2px] text-black">
        {mode === "edit" ? "메뉴 수정" : "새 메뉴 등록"}
      </h2>

      {/* 사진 첨부 */}
      <div className="mt-[20px] flex h-[200px] flex-col items-center justify-center gap-[8px] rounded-[25px] border border-dashed border-black/50 text-black/50">
        <PhotoIcon />
        <span className="text-[18px] font-medium tracking-[1.5px]">사진 첨부</span>
        <span className="text-[14px] tracking-[1px]">JPG, PNG (최대 5MB)</span>
      </div>

      <FormLabel>메뉴명</FormLabel>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="예) 참치마요 컵밥"
        className="h-[48px] rounded-[10px] border border-black/50 bg-canvas px-[24px] text-[15px] tracking-[1px] outline-none placeholder:text-black/50 focus:border-black"
      />

      <FormLabel>가격</FormLabel>
      <div className="relative">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="예) 6800"
          className="h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[24px] pr-[48px] text-[15px] tracking-[1px] outline-none placeholder:text-black/50 focus:border-black"
        />
        <span className="absolute right-[20px] top-1/2 -translate-y-1/2 text-[15px] text-black/50">
          원
        </span>
      </div>

      <FormLabel>카테고리</FormLabel>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as MenuCategory)}
        className="h-[48px] rounded-[10px] border border-black/50 bg-canvas px-[20px] text-[15px] tracking-[1px] outline-none focus:border-black"
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <FormLabel>토핑 선택</FormLabel>
      <select
        value={topping}
        onChange={(e) => setTopping(e.target.value)}
        className="h-[48px] rounded-[10px] border border-black/50 bg-canvas px-[20px] text-[15px] tracking-[1px] outline-none focus:border-black"
      >
        <option value="가능">가능</option>
        <option value="불가능">불가능</option>
      </select>

      {mode === "edit" && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="mt-[28px] h-[48px] w-full rounded-[10px] border border-danger bg-canvas text-[15px] font-medium tracking-[1px] text-danger"
        >
          메뉴 삭제
        </button>
      )}

      <div className={`${mode === "edit" && onDelete ? "mt-[12px]" : "mt-[28px]"} flex gap-[16px]`}>
        <button
          type="button"
          onClick={onClose}
          className="h-[48px] flex-1 rounded-[10px] border border-black/50 bg-canvas text-[15px] font-medium tracking-[1px] text-black"
        >
          취소
        </button>
        <button
          type="submit"
          className="h-[48px] flex-[1.2] rounded-[10px] bg-black text-[15px] font-medium tracking-[1px] text-canvas"
        >
          저장
        </button>
      </div>
    </form>
  );
}

function FormLabel({ children }: { children: string }) {
  return (
    <label className="mt-[24px] mb-[10px] block text-[20px] font-medium tracking-[1.5px] text-black">
      {children}
    </label>
  );
}

function PhotoIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M4 18l5-5 4 4 3-3 4 4" />
    </svg>
  );
}
