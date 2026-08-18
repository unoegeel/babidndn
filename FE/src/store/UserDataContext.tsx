import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { CartItem, MenuDetail, MenuOption, Order, OrderStatus, NotificationItem, NotificationType } from "../types/user";
import { orderService } from "../services/user/orderService";
import type { OrderDetailResponse } from "../types/api";
import { claimReadyCall, clearReadyBannerDismiss } from "../utils/readyCall";
import { useOrderPolling } from "../hooks/useOrderPolling";
import { useCartState } from "../hooks/useCartState";
import { useConfettiPlay } from "../hooks/useConfettiPlay";
import { useUserNotifications } from "../hooks/useUserNotifications";

const ORDERS_STORAGE_KEY = "babi_user_orders";

interface UserDataContextType {
  cart: CartItem[];
  orders: Order[];
  activeOrders: Order[];
  notifications: NotificationItem[];
  /** 최근 READY 호출/재호출 시그널 (동일 updatedAt 중복 없음) */
  readyCallSignal: { orderId: string; updatedAt: string; isRecall: boolean } | null;
  /** Shell 레벨 confetti (페이지 전환·리마운트에도 유지) */
  confettiPlay: { playKey: string } | null;
  startConfetti: (playKey: string, onDone?: () => void) => void;
  stopConfetti: () => void;
  finishConfetti: () => void;
  addToCart: (menu: MenuDetail, selectedOptions: MenuOption[], quantity: number) => void;
  updateCartQuantity: (cartItemId: string, newQuantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  restoreCart: (items: CartItem[]) => void;
  createOrder: (paymentMethod?: string) => Promise<OrderDetailResponse>;
  getOrderById: (orderId: string) => Order | null;
  saveOrderToState: (order: Order) => void;
  cartTotal: number;
  addNotification: (type: NotificationType, title: string, message: string, orderId: string) => void;
  markAsRead: (id: string) => void;
  /** 특정 주문의 알림을 읽음 처리 (type 지정 시 해당 유형만) */
  markNotificationsReadByOrder: (orderId: string, type?: NotificationType) => void;
  /** 픽업 완료/이탈 시 PREPARING·READY 알림 읽음 + 준비완료 배너 종료 */
  resolveOrderPickupNotifications: (orderId: string) => void;
  removeNotification: (id: string) => void;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

function readStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Order[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isActiveStatus(status: OrderStatus): boolean {
  return status === "PREPARING" || status === "READY";
}

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    cart,
    cartTotal,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    restoreCart,
  } = useCartState();
  const { confettiPlay, startConfetti, stopConfetti, finishConfetti } = useConfettiPlay();
  const {
    notifications,
    addNotification,
    markAsRead,
    markNotificationsReadByOrder,
    resolveOrderPickupNotifications,
    removeNotification,
  } = useUserNotifications();
  const [orders, setOrders] = useState<Order[]>(() => readStoredOrders());
  const [readyCallSignal, setReadyCallSignal] = useState<{
    orderId: string;
    updatedAt: string;
    isRecall: boolean;
  } | null>(null);

  // 주문별 앱 내 알림 중복 방지 (백그라운드 폴링용)
  const notifiedRef = useRef<Record<string, { preparing: boolean; ready: boolean; canceled: boolean; completed: boolean }>>({});
  /** 주문별 마지막으로 관측한 updatedAt — READY 재호출 구분 */
  const lastUpdatedAtRef = useRef<Record<string, string>>({});

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);

  const createOrder = async (): Promise<OrderDetailResponse> => {
    return orderService.createOrder(cart);
  };

  const saveOrderToState = useCallback((orderObj: Order) => {
    setOrders((prevOrders) => {
      const exists = prevOrders.some((o) => o.orderId === orderObj.orderId);
      if (exists) {
        return prevOrders.map((o) => (o.orderId === orderObj.orderId ? orderObj : o));
      }
      return [...prevOrders, orderObj];
    });
  }, []);

  const getOrderById = useCallback((orderId: string): Order | null => {
    return orders.find((o) => o.orderId === orderId) ?? null;
  }, [orders]);

  const activeOrders = useMemo(
    () => orders.filter((o) => isActiveStatus(o.status)),
    [orders],
  );

  /** 조리중·준비완료 주문은 COMPLETED/CANCELED 될 때까지 폴링 */
  const pollableOrderIds = useMemo(
    () =>
      orders
        .filter((o) => o.status === "PREPARING" || o.status === "READY")
        .map((o) => o.orderId)
        .sort(),
    [orders],
  );

  const handleBackgroundOrderUpdate = useCallback(
    (updated: Order) => {
      const id = updated.orderId;
      saveOrderToState(updated);

      if (!notifiedRef.current[id]) {
        notifiedRef.current[id] = { preparing: false, ready: false, canceled: false, completed: false };
      }
      const flags = notifiedRef.current[id];
      const nextUpdatedAt = updated.updatedAt ?? "";
      const prevUpdatedAt = lastUpdatedAtRef.current[id] ?? "";

      if (updated.status === "PREPARING" && !flags.preparing) {
        addNotification(
          "PREPARING",
          "조리 시작",
          `${updated.pickupNumber}번 주문을 조리하고 있습니다.`,
          updated.orderId,
        );
        flags.preparing = true;
      }

      if (updated.status === "READY") {
        if (!flags.ready) {
          addNotification(
            "READY",
            "준비 완료",
            `${updated.pickupNumber}번 주문이 준비되었습니다. 카운터에서 픽업해 주세요.`,
            updated.orderId,
          );
          flags.ready = true;
          if (nextUpdatedAt) {
            claimReadyCall(id, nextUpdatedAt);
          }
        } else if (
          nextUpdatedAt &&
          prevUpdatedAt &&
          prevUpdatedAt !== nextUpdatedAt &&
          claimReadyCall(id, nextUpdatedAt)
        ) {
          // 이미 READY인데 updatedAt이 바뀜 → 관리자 재호출
          clearReadyBannerDismiss(id);
          setReadyCallSignal({ orderId: id, updatedAt: nextUpdatedAt, isRecall: true });
        }
      }

      if (updated.status === "COMPLETED" && !flags.completed) {
        resolveOrderPickupNotifications(id);
        flags.completed = true;
      }

      if (nextUpdatedAt) {
        lastUpdatedAtRef.current[id] = nextUpdatedAt;
      }

      if (updated.status === "CANCELED" && !flags.canceled) {
        addNotification(
          "CANCELED",
          "주문 취소",
          `${updated.pickupNumber}번 주문이 취소되었습니다.`,
          updated.orderId,
        );
        flags.canceled = true;
      }
    },
    [saveOrderToState, addNotification, resolveOrderPickupNotifications],
  );

  // 진행 중 주문 전체를 백그라운드에서 폴링 — READY 이후에도 픽업완료 반영
  useOrderPolling({
    orderIds: pollableOrderIds,
    intervalMs: 3000,
    enabled: pollableOrderIds.length > 0,
    onOrderUpdate: handleBackgroundOrderUpdate,
    onError: (id, err) => {
      console.error(`진행 중 주문 폴링 실패 (id=${id}):`, err);
    },
  });

  return (
    <UserDataContext.Provider
      value={{
        cart,
        orders,
        activeOrders,
        notifications,
        readyCallSignal,
        confettiPlay,
        startConfetti,
        stopConfetti,
        finishConfetti,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        restoreCart,
        createOrder,
        getOrderById,
        saveOrderToState,
        cartTotal,
        addNotification,
        markAsRead,
        markNotificationsReadByOrder,
        resolveOrderPickupNotifications,
        removeNotification,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
};
