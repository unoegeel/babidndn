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
import type { Menu, MenuCategory, Order, Payment, PaymentStatus } from "../types/admin";
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
import {
  formatServerDateTime,
  formatServerTime,
  serverInstantMs,
} from "../utils/serverDate";
import { formatOrderItemOptionLabels } from "../utils/orderItemOptions";
import { formatPaymentStatusLabel } from "../utils/formatPaymentStatusLabel";
import { syncKitchenTicketAutoPrint } from "../utils/kitchenTicketAutoPrint";

/** API Payment.status → admin 결제 ViewModel 표시 상태 */
function toAdminPaymentStatus(apiStatus: string): PaymentStatus {
  const label = formatPaymentStatusLabel(apiStatus);
  if (label === "결제완료" || label === "결제취소" || label === "부분취소") {
    return label;
  }
  // formatter 폴백(확인불가 등) — 기존 non-canceled → 결제완료 와 동일하게 처리
  return "결제완료";
}

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
  /**
   * 카테고리 표시 순서 변경
   * @returns 성공 여부
   */
  reorderCategories: (categoryIds: number[]) => Promise<boolean>;
  /**
   * 카테고리 내 메뉴 표시 순서 변경
   * @returns 성공 여부
   */
  reorderMenus: (categoryId: number, menuIds: number[]) => Promise<boolean>;
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
  /** 캐시된 서버 주문 상세 (주문서 출력 등 UI 모델이 아닌 API shape 필요 시) */
  getOrderDetail: (orderId: string | number) => OrderDetailResponse | undefined;
  /** 특정 주문의 특정 메뉴 라인을 조리 완료 처리 (화면 전용 — 서버 상태는 호출 시 READY) */
  cookItems: (orderId: string, itemIds: string[]) => Promise<void>;
  /** 주문 호출 → 서버 READY 반영 + 주문번호 초록색 (여러 번 호출 가능) */
  callOrder: (orderId: string) => Promise<void>;
  /** 픽업 완료 → 서버 상태 COMPLETED 로 변경 후 보드에서 제거 */
  pickupOrder: (orderId: string) => Promise<void>;

  // 결제 내역
  /** 캐시된 서버 결제 정보 (영수증 등 — null이면 결제 없음, undefined면 미조회) */
  getPaymentByOrderId: (orderId: string | number) => PaymentResponse | null | undefined;
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

/** "14:48" 형식 (보드 카드 표시용) */
function formatTime(iso: string) {
  return formatServerTime(iso);
}

/** "2026.07.09 14:48" 형식 (결제 내역 표시용) */
function formatDateTime(iso: string) {
  return formatServerDateTime(iso);
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

/** 화면 전용 상태 (조리 체크는 서버에 없음. called는 READY로 복원) */
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
              badge: m.badge ?? "NONE",
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

  const reorderCategories = useCallback(
    async (categoryIds: number[]): Promise<boolean> => {
      try {
        const updated = await adminMenuService.reorderCategories(categoryIds);
        setCategoryList(
          [...updated].sort((a, b) => a.displayOrder - b.displayOrder),
        );
        return true;
      } catch (err) {
        console.error("카테고리 순서 변경 실패:", err);
        return false;
      }
    },
    [],
  );

  const reorderMenus = useCallback(
    async (categoryId: number, menuIds: number[]): Promise<boolean> => {
      try {
        const updated = await adminMenuService.reorderMenus(categoryId, menuIds);
        const displayOrderById = new Map(updated.map((m) => [String(m.id), m.displayOrder]));
        setMenus((prev) =>
          prev.map((m) => {
            const nextOrder = displayOrderById.get(m.id);
            if (nextOrder !== undefined && m.categoryId === categoryId) {
              return { ...m, displayOrder: nextOrder };
            }
            return m;
          }),
        );
        return true;
      } catch (err) {
        console.error("메뉴 순서 변경 실패:", err);
        return false;
      }
    },
    [],
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
      badge: detail.badge ?? "NONE",
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
          badge: menu.badge ?? "NONE",
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
          badge: patch.badge ?? detail.badge ?? "NONE",
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
          options: formatOrderItemOptionLabels(item.options),
          cooked: serverReady || uiState.cookedItemIds.has(String(item.id)),
        }));

        const allCooked = items.length > 0 && items.every((it) => it.cooked);
        const status: Order["status"] = allCooked
          ? "done"
          : items.some((it) => it.cooked)
            ? "cooking"
            : "waiting";

        // 호출 여부는 /call API가 서버에 남긴 READY로 복원 (새로고침·재진입 시 유지)
        // 같은 세션의 낙관적 UI 상태(uiState.called)도 함께 반영
        if (serverReady) {
          uiState.called = true;
        }

        return {
          id: orderId,
          number: summary.pickupNumber,
          time: formatTime(summary.pickupAssignedAt ?? summary.createdAt),
          items,
          status,
          called: uiState.called || serverReady,
        };
      });
  }, []);

  const refreshOrders = useCallback(async () => {
    const summaries = await adminOrderService.getOrders();
    // BE returns FIFO queue order (pickupAssignedAt asc) — do not re-sort by createdAt
    const active = summaries.filter(isActiveOrder);

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

    // 신규 주문만 주방 티켓 자동 출력 (세션당 주문 ID당 1회)
    syncKitchenTicketAutoPrint(
      active.map((s) => s.id),
      (orderId) => orderDetailCacheRef.current.get(orderId),
    );
  }, [buildOrders]);

  /** 화면 전용 상태 변경 후 현재 요약 기준으로 보드 다시 그리기 */
  const rebuildOrders = useCallback(() => {
    setOrders(buildOrders(activeSummariesRef.current));
  }, [buildOrders]);

  const getOrderDetail = useCallback((orderId: string | number) => {
    return orderDetailCacheRef.current.get(Number(orderId));
  }, []);

  const getPaymentByOrderId = useCallback((orderId: string | number) => {
    return paymentCacheRef.current.get(Number(orderId));
  }, []);

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
    // Payment history source of truth: /api/admin/payments (approvedAt DESC).
    // Never reuse GET /api/orders?view=queue — that is business-day FIFO only.
    const history = await paymentService.listHistory();

    const orderIds = [...new Set(history.map((p) => p.orderId))];
    await Promise.all(
      orderIds
        .filter((id) => !orderDetailCacheRef.current.has(id))
        .map(async (id) => {
          try {
            const detail = await adminOrderService.getOrder(id);
            orderDetailCacheRef.current.set(id, detail);
          } catch (err) {
            console.error(`주문 상세 조회 실패 (id=${id}):`, err);
          }
        }),
    );

    // Sync payment cache for refund path (getPaymentByOrderId)
    for (const item of history) {
      paymentCacheRef.current.set(item.orderId, {
        id: item.id,
        paymentKey: item.paymentKey,
        orderId: item.orderId,
        tossOrderId: "",
        amount: item.amount,
        status: item.status,
        cancelReason: item.cancelReason ?? null,
        approvedAt: item.approvedAt,
        createdAt: item.createdAt,
        methodLabel: item.methodLabel ?? null,
      });
    }

    const rows = history.map((item) => {
      const detail = orderDetailCacheRef.current.get(item.orderId);
      const approvedRaw = item.approvedAt ?? item.createdAt;
      const approvedMs = serverInstantMs(approvedRaw);
      return {
        id: String(item.id),
        paidAt: formatDateTime(approvedRaw),
        paidAtMs: Number.isFinite(approvedMs) ? approvedMs : 0,
        orderNumber: item.pickupNumber,
        method: item.methodLabel?.trim() || "토스페이먼츠",
        amount: item.amount,
        status: toAdminPaymentStatus(item.status),
        summary: summarize(detail),
        orderId: item.orderId,
        paymentKey: item.paymentKey,
      };
    });

    // Immutable copy — never mutate shared queue/order arrays
    setPayments([...rows].sort((a, b) => b.paidAtMs - a.paidAtMs));
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
      reorderCategories,
      reorderMenus,
      toggleMenuStatus,
      addMenu,
      updateMenu,
      deleteMenu,
      getMenuDetail,
      getOrderDetail,
      getPaymentByOrderId,
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
      reorderCategories,
      reorderMenus,
      toggleMenuStatus,
      addMenu,
      updateMenu,
      deleteMenu,
      getMenuDetail,
      getOrderDetail,
      getPaymentByOrderId,
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
