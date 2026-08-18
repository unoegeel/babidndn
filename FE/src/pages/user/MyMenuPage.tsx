import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MenuDetail, MenuOption } from "../../types/user";
import type { SavedMenuResponse } from "../../types/api";
import { savedMenuService } from "../../services/user/savedMenuService";
import { menuService } from "../../services/user/menuService";
import { useUserData } from "../../store/UserDataContext";
import { SavedMenuCard } from "../../components/user/SavedMenuCard";
import { MenuOptionModal } from "../../components/user/MenuOptionModal";
import { RenameSavedMenuPopup } from "../../components/user/RenameSavedMenuPopup";
import { QuickCartBar } from "../../components/user/QuickCartBar";
import { ApiError } from "../../api/client";
import { savedOptionsToRequest, toOptionQuantities } from "../../utils/savedMenuCombo";

function liveOptionsFromSaved(detail: MenuDetail, saved: SavedMenuResponse): MenuOption[] {
  const selected: MenuOption[] = [];
  for (const savedOption of saved.options) {
    if (savedOption.menuOptionId == null) {
      throw new Error("옵션을 다시 선택해 주세요.");
    }
    const live = detail.options.find((option) => option.id === savedOption.menuOptionId);
    if (!live) {
      throw new Error("옵션을 다시 선택해 주세요.");
    }
    for (let i = 0; i < savedOption.quantity; i += 1) {
      selected.push(live);
    }
  }
  return selected;
}

export const MyMenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart } = useUserData();
  const [items, setItems] = useState<SavedMenuResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [retuneTarget, setRetuneTarget] = useState<SavedMenuResponse | null>(null);
  const [retuneDetail, setRetuneDetail] = useState<MenuDetail | null>(null);
  const [renameTarget, setRenameTarget] = useState<SavedMenuResponse | null>(null);
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await savedMenuService.list();
      setItems(data);
    } catch {
      setError("나만의 메뉴를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const withLiveMenu = async (saved: SavedMenuResponse) => {
    if (saved.menuId == null) {
      throw new Error("판매가 종료된 메뉴입니다.");
    }
    return menuService.getMenuDetail(saved.menuId);
  };

  const handleAdd = async (saved: SavedMenuResponse, goToCart: boolean) => {
    if (saved.status !== "AVAILABLE") return;
    setBusyId(saved.id);
    try {
      const detail = await withLiveMenu(saved);
      const selected = liveOptionsFromSaved(detail, saved);
      addToCart(detail, selected, 1);
      if (goToCart) {
        navigate("/user/cart");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "장바구니에 담지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (saved: SavedMenuResponse) => {
    if (!window.confirm("이 나만의 메뉴를 삭제할까요?")) return;
    setBusyId(saved.id);
    try {
      await savedMenuService.remove(saved.id);
      setItems((prev) => prev.filter((item) => item.id !== saved.id));
    } catch {
      alert("삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRetune = async (saved: SavedMenuResponse) => {
    if (saved.menuId == null) return;
    setBusyId(saved.id);
    try {
      const detail = await menuService.getMenuDetail(saved.menuId);
      setRetuneTarget(saved);
      setRetuneDetail(detail);
    } catch {
      alert("현재 메뉴 옵션을 불러오지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRetuneSave = async (selectedOptions: MenuOption[]) => {
    if (!retuneTarget) return;
    try {
      const updated = await savedMenuService.update(retuneTarget.id, {
        customName: retuneTarget.customName,
        options: toOptionQuantities(selectedOptions),
      });
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setRetuneTarget(null);
      setRetuneDetail(null);
    } catch (err) {
      alert(
        err instanceof ApiError && err.message
          ? err.message
          : "옵션 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  };

  const handleRenameSave = async (customName: string) => {
    if (!renameTarget) return;
    setRenameSubmitting(true);
    setRenameError(null);
    try {
      const updated = await savedMenuService.update(renameTarget.id, {
        customName,
        options: savedOptionsToRequest(renameTarget.options),
      });
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setRenameTarget(null);
    } catch (err) {
      setRenameError(
        err instanceof ApiError && err.message
          ? err.message
          : "이름 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setRenameSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white p-8">
        <p className="text-xs font-semibold text-gray-500">나만의 메뉴를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-white p-8 text-center">
        <p className="text-xs font-bold text-gray-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-white">
      {items.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-4">
          <p className="text-center text-xs font-bold text-gray-400">
            아직 등록한 나만의 메뉴가 없습니다.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-3.5">
            {items.map((saved) => (
              <SavedMenuCard
                key={saved.id}
                saved={saved}
                busy={busyId === saved.id}
                onAdd={() => void handleAdd(saved, false)}
                onOrder={() => void handleAdd(saved, true)}
                onRetune={() => void handleRetune(saved)}
                onDelete={() => void handleDelete(saved)}
                onRename={() => {
                  setRenameError(null);
                  setRenameTarget(saved);
                }}
              />
            ))}
          </div>
        </div>
      )}

      <QuickCartBar />

      {retuneDetail && retuneTarget && (
        <MenuOptionModal
          menuDetail={retuneDetail}
          mode="retune"
          onClose={() => {
            setRetuneDetail(null);
            setRetuneTarget(null);
          }}
          onAddToCart={(selectedOptions) => {
            void handleRetuneSave(selectedOptions);
          }}
        />
      )}

      {renameTarget && (
        <RenameSavedMenuPopup
          initialName={renameTarget.customName}
          submitting={renameSubmitting}
          error={renameError}
          onClose={() => {
            if (!renameSubmitting) {
              setRenameTarget(null);
              setRenameError(null);
            }
          }}
          onSubmit={(customName) => void handleRenameSave(customName)}
        />
      )}
    </div>
  );
};

export default MyMenuPage;
