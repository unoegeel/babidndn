import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import AdminShell from "../../components/AdminShell";
import { CategoryManageModal } from "../../components/owner/menu/CategoryManageModal";
import { MenuCard } from "../../components/owner/menu/MenuCard";
import { MenuForm } from "../../components/owner/menu/MenuForm";
import { useAdminData } from "../../store/AdminDataContext";
import type { Menu, MenuCategory } from "../../types/admin";

/** 우측 패널 상태: 닫힘 | 신규 등록 | 특정 메뉴 수정 */
type PanelState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; menuId: string };

function sortCategoryMenus(items: Menu[]): Menu[] {
  return [...items].sort((a, b) => {
    const orderDiff = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return Number(a.id) - Number(b.id);
  });
}

export default function MenuManagementPage() {
  const {
    categories,
    categoryList,
    menus,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    reorderMenus,
    toggleMenuStatus,
    addMenu,
    updateMenu,
    deleteMenu,
    getMenuDetail,
  } = useAdminData();
  const [tab, setTab] = useState<MenuCategory>(categories[0] ?? "");
  const [panel, setPanel] = useState<PanelState>({ mode: "closed" });
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [isReorderingMenus, setIsReorderingMenus] = useState(false);
  const [orderedMenus, setOrderedMenus] = useState<Menu[]>([]);
  const [menusForCategory, setMenusForCategory] = useState<Menu[]>([]);
  // 수정 대상 메뉴의 상세 정보 (토핑 여부 등은 목록에 없어 서버에서 조회)
  const [editing, setEditing] = useState<Menu | null>(null);

  const orderedRef = useRef<Menu[]>([]);
  const orderBeforeDragRef = useRef<Menu[]>([]);
  const suppressClickRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  // 서버에서 카테고리를 받기 전이거나 선택한 탭이 사라진 경우 첫 카테고리 사용
  const activeTab = categories.includes(tab) ? tab : categories[0] ?? "";

  const categoryMenus = useMemo(
    () => sortCategoryMenus(menus.filter((m) => m.category === activeTab)),
    [menus, activeTab],
  );

  useEffect(() => {
    orderedRef.current = orderedMenus;
  }, [orderedMenus]);

  if (categoryMenus !== menusForCategory && !isReorderingMenus) {
    setMenusForCategory(categoryMenus);
    setOrderedMenus(categoryMenus);
  }

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

  const activeCategory = categoryList.find((c) => c.name === activeTab);

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

  const handleDragStart = () => {
    orderBeforeDragRef.current = orderedRef.current;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const prev = orderedRef.current;
    const oldIndex = prev.findIndex((m) => m.id === String(active.id));
    const newIndex = prev.findIndex((m) => m.id === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(prev, oldIndex, newIndex);
    orderedRef.current = next;
    setOrderedMenus(next);

    const prevIds = orderBeforeDragRef.current.map((m) => m.id).join(",");
    const nextIds = next.map((m) => m.id).join(",");
    if (prevIds === nextIds) return;

    if (!activeCategory) {
      orderedRef.current = orderBeforeDragRef.current;
      setOrderedMenus(orderBeforeDragRef.current);
      alert("카테고리 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요.");
      return;
    }

    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);

    setIsReorderingMenus(true);
    void reorderMenus(
      activeCategory.id,
      next.map((m) => Number(m.id)),
    ).then((ok) => {
      setIsReorderingMenus(false);
      if (!ok) {
        orderedRef.current = orderBeforeDragRef.current;
        setOrderedMenus(orderBeforeDragRef.current);
        alert("메뉴 순서를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  };

  return (
    <AdminShell>
      <div className="flex h-full min-h-0 flex-col p-[16px] md:p-[24px] short:p-[12px]">
        {/* 헤더 */}
        <div className="mb-[16px] flex shrink-0 flex-wrap items-center justify-between gap-[12px] short:mb-[10px]">
          <h1 className="text-[22px] font-bold text-black short:text-[18px]">메뉴 관리</h1>
          <button
            onClick={openCreatePanel}
            className="h-[48px] rounded-[10px] border border-black/50 bg-black px-[20px] text-[15px] font-medium text-white"
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
              className={`h-[48px] rounded-[10px] border border-black/50 px-[24px] text-[15px] font-medium ${
                activeTab === c ? "bg-black text-white" : "bg-canvas text-black"
              }`}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            className="h-[48px] rounded-[10px] border border-dashed border-black/50 bg-canvas px-[24px] text-[15px] font-medium text-black/70 hover:border-black hover:text-black"
          >
            카테고리 관리
          </button>
        </div>

        {/* 본문: 메뉴 그리드 + (등록 폼) */}
        {/* 좁은 화면(태블릿 세로 등)에서는 폼이 아래로 내려가도록 세로 배치 */}
        <div className="flex min-h-0 flex-1 flex-col gap-[16px] overflow-auto lg:flex-row lg:gap-[24px] lg:overflow-hidden">
          {orderedMenus.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="max-w-[12em] text-center text-[15px] text-black/50">
                이 카테고리에 등록된 메뉴가 없습니다.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedMenus.map((m) => m.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] content-start gap-[16px] pr-[4px] md:gap-[24px] lg:overflow-auto">
                  {orderedMenus.map((menu) => (
                    <MenuCard
                      key={menu.id}
                      menu={menu}
                      selected={editing?.id === menu.id}
                      onEdit={() => openEditPanel(menu.id)}
                      onToggleStatus={() => toggleMenuStatus(menu.id)}
                      sortableDisabled={isReorderingMenus}
                      suppressClickRef={suppressClickRef}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

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
          onReorder={reorderCategories}
        />
      )}
    </AdminShell>
  );
}
