import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Menu, MenuCategory, Order, Payment } from "../types/admin";
import type {
  CategoryResponse,
  OrderDetailResponse,
  OrderSummaryResponse,
  PaymentResponse,
} from "../types/api";
import { adminMenuService } from "../services/admin/menuService";
import { adminOrderService } from "../services/admin/orderService";
import { paymentService } from "../services/admin/paymentService";
import { ApiError } from "../api/client";
import { parseServerDate } from "../utils/serverDate";

interface AdminDataValue {
  categories: MenuCategory[];
  /** 서버 카테고리 원본 (id 포함 — 카테고리 수정/삭제에 사용) */
  categoryList: CategoryResponse[];
  menus: Menu[];
  orders: Order[];
  payments: Payment[];

  // 메뉴 관리
  /**
   * 카테고리 추가
   * @returns 추가 성공 여부 (빈 값이거나 이미 있는 이름이면 false)
   */
  addCategory: (name: string) => Promise<boolean>;
  /**
   * 카테고리 이름 변경
   * @returns 성공 여부
   */
  updateCategory: (categoryId: number, name: string) => Promise<boolean>;
  /**
   * 카테고리 삭제
   * @returns 성공 여부 (메뉴가 남아 있으면 서버가 거부할 수 있음)
   */
  deleteCategory: (categoryId: number) => Promise<boolean>;
  toggleMenuStatus: (id: string) => Promise<void>;
  addMenu: (menu: Omit<Menu, "id">) => Promise<void>;
  /** 기존 메뉴 정보 수정 */
  updateMenu: (id: string, patch: Omit<Menu, "id" | "status">) => Promise<void>;
  /**
   * 메뉴 삭제
   * @returns 성공 여부
   */
  deleteMenu: (id: string) => Promise<boolean>;
  /** 메뉴 상세 조회 (토핑 여부 등 목록에 없는 정보 포함) */
  getMenuDetail: (id: string) => Promise<Menu>;

  // 주문 대시보드
  /** 특정 주문의 특정 메뉴 라인을 조리 완료 처리 (화면 전용 — 서버 상태는 호출 시 READY) */
  cookItems: (orderId: string, itemIds: string[]) => Promise<void>;
  /** 주문 호출 → 서버 READY 반영 + 주문번호 초록색 (여러 번 호출 가능) */
  callOrder: (orderId: string) => Promise<void>;
  /** 픽업 완료 → 서버 상태 COMPLETED 로 변경 후 보드에서 제거 */
  pickupOrder: (orderId: string) => Promise<void>;

  // 결제 내역
  /**
   * 결제 취소
   * @returns 취소 성공 여부
   */
  refundPayment: (id: string, reason: string) => Promise<boolean>;

  // 서버 데이터 새로고침
  refreshMenus: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshPayments: () => Promise<void>;
}

const AdminDataContext = createContext<AdminDataValue | null>(null);

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "14:48" 형식 (보드 카드 표시용) */
function formatTime(iso: string) {
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "2026.07.09 14:48" 형식 (결제 내역 표시용) */
function formatDateTime(iso: string) {
  const d = parseServerDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 결제 내역 요약 문구 ("삼겹소금 외 1개") */
function summarize(detail: OrderDetailResponse | undefined): string {
  if (!detail || detail.items.length === 0) return "-";
  const [first, ...rest] = detail.items;
  return rest.length === 0 ? first.menuName : `${first.menuName} 외 ${rest.length}개`;
}

/** 대시보드에 표시할 주문인지 (결제 완료 + 진행 중만) */
function isActiveOrder(summary: OrderSummaryResponse): boolean {
  return (
    summary.paymentStatus === "DONE" &&
    (summary.status === "PREPARING" || summary.status === "READY")
  );
}

/** 화면 전용 상태 (서버에 없는 조리 체크·호출 여부) */
interface OrderUiState {
  cookedItemIds: Set<string>;
  called: boolean;
}

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [categoryList, setCategoryList] = useState<CategoryResponse[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // 주문 상세·결제 정보 캐시 (매 폴링마다 전체 재조회하지 않도록)
  const orderDetailCacheRef = useRef(new Map<number, OrderDetailResponse>());
  const paymentCacheRef = useRef(new Map<number, PaymentResponse | null>());
  const orderUiStateRef = useRef(new Map<string, OrderUiState>());
  // 마지막으로 받아온 진행 중 주문 요약 (화면 전용 상태 변경 시 재구성에 사용)
  const activeSummariesRef = useRef<OrderSummaryResponse[]>([]);

  const getUiState = (orderId: string): OrderUiState => {
    let state = orderUiStateRef.current.get(orderId);
    if (!state) {
      state = { cookedItemIds: new Set<string>(), called: false };
      orderUiStateRef.current.set(orderId, state);
    }
    return state;
  };

  /* ── 메뉴 관리 ── */

  const refreshMenus = useCallback(async () => {
    const [categoriesData, menuGroups] = await Promise.all([
      adminMenuService.getCategories(),
      adminMenuService.getMenus(),
    ]);

    setCategoryList(
      [...categoriesData].sort((a, b) => a.displayOrder - b.displayOrder),
    );
    setMenus(
      menuGroups
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .flatMap((group) =>
          group.menus
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((m) => ({
              id: String(m.id),
              name: m.name,
              price: m.basePrice,
              category: group.categoryName,
              status: (m.saleStatus === "SOLDOUT" ? "품절" : "판매중") as Menu["status"],
              // 목록 응답에는 토핑 여부가 없어 상세 조회(getMenuDetail)로 채웁니다.
              toppingAvailable: true,
              categoryId: group.categoryId,
              displayOrder: m.displayOrder,
              description: m.description,
              imageUrl: m.imageUrl,
            })),
        ),
    );
  }, []);

  const categories = useMemo(
    () => categoryList.map((c) => c.name),
    [categoryList],
  );

  const addCategory = useCallback(
    async (name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed || categories.includes(trimmed)) return false;
      try {
        const nextOrder =
          categoryList.reduce((max, c) => Math.max(max, c.displayOrder), 0) + 1;
        await adminMenuService.createCategory({ name: trimmed, displayOrder: nextOrder });
        await refreshMenus();
        return true;
      } catch (err) {
        console.error("카테고리 추가 실패:", err);
        return false;
      }
    },
    [categories, categoryList, refreshMenus],
  );

  const updateCategory = useCallback(
    async (categoryId: number, name: string): Promise<boolean> => {
      const trimmed = name.trim();
      const current = categoryList.find((c) => c.id === categoryId);
      if (!trimmed || !current) return false;
      // 다른 카테고리와 이름이 겹치면 실패 처리
      if (categoryList.some((c) => c.id !== categoryId && c.name === trimmed)) return false;
      try {
        await adminMenuService.updateCategory(categoryId, {
          name: trimmed,
          displayOrder: current.displayOrder,
        });
        await refreshMenus();
        return true;
      } catch (err) {
        console.error("카테고리 수정 실패:", err);
        return false;
      }
    },
    [categoryList, refreshMenus],
  );

  const deleteCategory = useCallback(
    async (categoryId: number): Promise<boolean> => {
      try {
        await adminMenuService.deleteCategory(categoryId);
        await refreshMenus();
        return true;
      } catch (err) {
        console.error("카테고리 삭제 실패:", err);
        // 서버가 이유(예: 메뉴가 남아 있음)를 내려주면 그대로 안내
        if (err instanceof ApiError && err.message) {
          alert(err.message);
        } else {
          alert("카테고리 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
        return false;
      }
    },
    [refreshMenus],
  );

  const toggleMenuStatus = useCallback(
    async (id: string) => {
      const menu = menus.find((m) => m.id === id);
      if (!menu) return;
      const nextStatus = menu.status === "판매중" ? "SOLDOUT" : "AVAILABLE";

      // 낙관적 업데이트 후 서버 반영
      setMenus((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: nextStatus === "SOLDOUT" ? "품절" : "판매중" }
            : m,
        ),
      );
      try {
        await adminMenuService.updateSaleStatus(id, nextStatus);
      } catch (err) {
        console.error("판매 상태 변경 실패:", err);
        alert("판매 상태 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        await refreshMenus();
      }
    },
    [menus, refreshMenus],
  );

  const getMenuDetail = useCallback(async (id: string): Promise<Menu> => {
    const detail = await adminMenuService.getMenu(id);
    return {
      id: String(detail.id),
      name: detail.name,
      price: detail.basePrice,
      category: detail.categoryName,
      status: detail.saleStatus === "SOLDOUT" ? "품절" : "판매중",
      toppingAvailable: detail.toppingEnabled,
      categoryId: detail.categoryId,
      displayOrder: detail.displayOrder,
      description: detail.description,
      imageUrl: detail.imageUrl,
    };
  }, []);

  const addMenu = useCallback(
    async (menu: Omit<Menu, "id">) => {
      const category = categoryList.find((c) => c.name === menu.category);
      if (!category) {
        alert("카테고리 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요.");
        return;
      }
      try {
        const nextOrder =
          menus
            .filter((m) => m.category === menu.category)
            .reduce((max, m) => Math.max(max, m.displayOrder ?? 0), 0) + 1;
        await adminMenuService.createMenu({
          categoryId: category.id,
          name: menu.name,
          basePrice: menu.price,
          imageUrl: menu.imageUrl ?? null,
          displayOrder: nextOrder,
          saleStatus: menu.status === "품절" ? "SOLDOUT" : "AVAILABLE",
          toppingEnabled: menu.toppingAvailable,
        });
        await refreshMenus();
      } catch (err) {
        console.error("메뉴 등록 실패:", err);
        alert("메뉴 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    },
    [categoryList, menus, refreshMenus],
  );

  const updateMenu = useCallback(
    async (id: string, patch: Omit<Menu, "id" | "status">) => {
      try {
        // 목록에 없는 필드(설명·이미지·표시 순서 등)를 보존하기 위해 상세를 먼저 조회
        const detail = await adminMenuService.getMenu(id);
        const targetCategory = categoryList.find((c) => c.name === patch.category);
        if (!targetCategory) {
          alert("카테고리 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요.");
          return;
        }

        const categoryChanged = targetCategory.id !== detail.categoryId;
        const displayOrder = categoryChanged
          ? menus
              .filter((m) => m.category === patch.category)
              .reduce((max, m) => Math.max(max, m.displayOrder ?? 0), 0) + 1
          : detail.displayOrder;

        await adminMenuService.updateMenu(id, {
          categoryId: targetCategory.id,
          name: patch.name,
          description: detail.description,
          basePrice: patch.price,
          imageUrl: patch.imageUrl !== undefined ? patch.imageUrl : detail.imageUrl,
          displayOrder,
          saleStatus: detail.saleStatus,
          toppingEnabled: patch.toppingAvailable,
        });
        await refreshMenus();
      } catch (err) {
        console.error("메뉴 수정 실패:", err);
        alert("메뉴 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    },
    [categoryList, menus, refreshMenus],
  );

  const deleteMenu = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await adminMenuService.deleteMenu(id);
        await refreshMenus();
        return true;
      } catch (err) {
        console.error("메뉴 삭제 실패:", err);
        if (err instanceof ApiError && err.message) {
          alert(err.message);
        } else {
          alert("메뉴 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
        return false;
      }
    },
    [refreshMenus],
  );

  /* ── 주문 대시보드 ── */

  /** 요약 + 상세 캐시 + 화면 전용 상태를 합쳐 보드용 주문 목록 구성 */
  const buildOrders = useCallback((summaries: OrderSummaryResponse[]): Order[] => {
    return summaries
      .filter((s) => orderDetailCacheRef.current.has(s.id))
      .map((summary) => {
        const detail = orderDetailCacheRef.current.get(summary.id)!;
        const orderId = String(summary.id);
        const uiState = getUiState(orderId);
        const serverReady = summary.status === "READY";

        const items = detail.items.map((item) => ({
          id: String(item.id),
          name: item.menuName,
          quantity: item.quantity,
          options: item.options.map((opt) =>
            opt.quantity > 1 ? `${opt.name} x ${opt.quantity}` : opt.name,
          ),
          cooked: serverReady || uiState.cookedItemIds.has(String(item.id)),
        }));

        const allCooked = items.length > 0 && items.every((it) => it.cooked);
        const status: Order["status"] = allCooked
          ? "done"
          : items.some((it) => it.cooked)
            ? "cooking"
            : "waiting";

        return {
          id: orderId,
          number: summary.pickupNumber,
          time: formatTime(summary.createdAt),
          items,
          status,
          called: uiState.called,
        };
      });
  }, []);

  const refreshOrders = useCallback(async () => {
    const summaries = await adminOrderService.getOrders();
    // 서버는 최근 생성 순 → 보드는 접수 순(오래된 주문부터)으로 표시
    const active = summaries.filter(isActiveOrder).reverse();

    // 아직 상세를 받아오지 않은 주문만 조회 (메뉴 구성은 바뀌지 않으므로 캐시 재사용)
    const missing = active.filter((s) => !orderDetailCacheRef.current.has(s.id));
    await Promise.all(
      missing.map(async (s) => {
        try {
          const detail = await adminOrderService.getOrder(s.id);
          orderDetailCacheRef.current.set(s.id, detail);
        } catch (err) {
          console.error(`주문 상세 조회 실패 (id=${s.id}):`, err);
        }
      }),
    );

    activeSummariesRef.current = active;
    setOrders(buildOrders(active));
  }, [buildOrders]);

  /** 화면 전용 상태 변경 후 현재 요약 기준으로 보드 다시 그리기 */
  const rebuildOrders = useCallback(() => {
    setOrders(buildOrders(activeSummariesRef.current));
  }, [buildOrders]);

  const cookItems = useCallback(
    async (orderId: string, itemIds: string[]) => {
      // 조리 체크는 주방 화면 전용. 고객 준비완료(READY)는 '호출'에서만 반영합니다.
      // (이전에는 전체 조리완료 시 PUT /status → READY 를 호출해, 호출 API와 역할이 겹치고
      //  상태 변경 실패 알림이 뜨는 문제가 있었습니다.)
      const uiState = getUiState(orderId);
      itemIds.forEach((id) => uiState.cookedItemIds.add(id));
      rebuildOrders();
    },
    [rebuildOrders],
  );

  const callOrder = useCallback(
    async (orderId: string) => {
      // 서버 READY 반영 성공 후에만 호출 UI를 켜서, 실패 시 고객/관리자 상태 불일치를 막습니다.
      try {
        const updated = await adminOrderService.call(orderId);
        if (updated.status !== "READY" && updated.status !== "COMPLETED") {
          throw new Error(`호출 후 상태가 READY가 아닙니다. (현재: ${updated.status})`);
        }
        getUiState(orderId).called = true;
        await refreshOrders();
      } catch (err) {
        console.error("호출(준비 완료) 처리 실패:", err);
        const detail = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "";
        alert(
          detail
            ? `호출 처리에 실패했습니다.\n${detail}`
            : "호출 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        );
        await refreshOrders();
        throw err;
      }
    },
    [refreshOrders],
  );

  const pickupOrder = useCallback(
    async (orderId: string) => {
      try {
        try {
          await adminOrderService.complete(orderId);
        } catch (firstErr) {
          // complete API 실패 시 READY → COMPLETED 2단계로 재시도
          console.warn("complete API 실패, status 전이로 재시도:", firstErr);
          try {
            await adminOrderService.updateStatus(orderId, "READY");
          } catch {
            // 이미 READY 이면 무시
          }
          await adminOrderService.updateStatus(orderId, "COMPLETED");
        }
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        await refreshOrders();
      } catch (err) {
        console.error("픽업 완료 처리 실패:", err);
        const detail =
          err instanceof ApiError
            ? `[${err.status}${err.code ? ` ${err.code}` : ""}] ${err.message || "응답 메시지 없음"}`
            : err instanceof Error
              ? err.message
              : "";
        alert(
          detail
            ? `픽업 완료 처리에 실패했습니다.\n${detail}`
            : "픽업 완료 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        );
        await refreshOrders();
        throw err;
      }
    },
    [refreshOrders],
  );

  /* ── 결제 내역 ── */

  const refreshPayments = useCallback(async () => {
    const summaries = await adminOrderService.getOrders();

    // 요약 문구("삼겹소금 외 1개")를 만들기 위해 주문 상세도 확보
    await Promise.all(
      summaries
        .filter((s) => !orderDetailCacheRef.current.has(s.id))
        .map(async (s) => {
          try {
            const detail = await adminOrderService.getOrder(s.id);
            orderDetailCacheRef.current.set(s.id, detail);
          } catch (err) {
            console.error(`주문 상세 조회 실패 (id=${s.id}):`, err);
          }
        }),
    );

    // 결제 정보 조회 (결제 전 주문은 404 → null 캐시)
    await Promise.all(
      summaries
        .filter((s) => !paymentCacheRef.current.has(s.id))
        .map(async (s) => {
          try {
            const payment = await paymentService.getByOrderId(s.id);
            paymentCacheRef.current.set(s.id, payment);
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              paymentCacheRef.current.set(s.id, null);
            } else {
              console.error(`결제 조회 실패 (orderId=${s.id}):`, err);
            }
          }
        }),
    );

    setPayments(
      summaries.map((summary) => {
        const payment = paymentCacheRef.current.get(summary.id) ?? null;
        const detail = orderDetailCacheRef.current.get(summary.id);

        if (!payment) {
          return {
            id: `order-${summary.id}`,
            paidAt: formatDateTime(summary.createdAt),
            orderNumber: summary.pickupNumber,
            method: "-",
            amount: summary.totalAmount,
            status: "미결제" as const,
            summary: summarize(detail),
            orderId: summary.id,
          };
        }

        const canceled =
          payment.status === "CANCELED" || payment.status === "PARTIAL_CANCELED";
        return {
          id: String(payment.id),
          paidAt: formatDateTime(payment.approvedAt ?? payment.createdAt),
          orderNumber: summary.pickupNumber,
          method: "토스페이먼츠",
          amount: payment.amount,
          status: canceled ? ("취소됨" as const) : ("결제완료" as const),
          summary: summarize(detail),
          orderId: summary.id,
          paymentKey: payment.paymentKey,
        };
      }),
    );
  }, []);

  const refundPayment = useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      const payment = payments.find((p) => p.id === id);
      if (!payment?.paymentKey) return false;
      try {
        await paymentService.cancel(payment.paymentKey, reason);
        if (payment.orderId !== undefined) {
          paymentCacheRef.current.delete(payment.orderId);
        }
        await refreshPayments();
        return true;
      } catch (err) {
        console.error("결제 취소 실패:", err);
        return false;
      }
    },
    [payments, refreshPayments],
  );

  /* ── 초기 로드 ── */

  useEffect(() => {
    // 서버 데이터 최초 조회 (상태 갱신은 응답 수신 후 비동기로 일어남)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshMenus().catch((err) => console.error("메뉴 조회 실패:", err));
    refreshOrders().catch((err) => console.error("주문 조회 실패:", err));
  }, [refreshMenus, refreshOrders]);

  const value = useMemo<AdminDataValue>(
    () => ({
      categories,
      categoryList,
      menus,
      orders,
      payments,
      addCategory,
      updateCategory,
      deleteCategory,
      toggleMenuStatus,
      addMenu,
      updateMenu,
      deleteMenu,
      getMenuDetail,
      cookItems,
      callOrder,
      pickupOrder,
      refundPayment,
      refreshMenus,
      refreshOrders,
      refreshPayments,
    }),
    [
      categories,
      categoryList,
      menus,
      orders,
      payments,
      addCategory,
      updateCategory,
      deleteCategory,
      toggleMenuStatus,
      addMenu,
      updateMenu,
      deleteMenu,
      getMenuDetail,
      cookItems,
      callOrder,
      pickupOrder,
      refundPayment,
      refreshMenus,
      refreshOrders,
      refreshPayments,
    ],
  );

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) {
    throw new Error("useAdminData must be used within AdminDataProvider");
  }
  return ctx;
}
