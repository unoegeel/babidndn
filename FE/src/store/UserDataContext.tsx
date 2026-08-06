import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { CartItem, MenuDetail, MenuOption, Order, OrderStatus, NotificationItem, NotificationType } from "../types/user";
import { orderService, mapOrderDetailToOrder, type OrderDetailResponse } from "../services/user/orderService";

const ORDERS_STORAGE_KEY = "babi_user_orders";
const NOTIFS_STORAGE_KEY = "babi_user_notifications";

interface UserDataContextType {
  cart: CartItem[];
  orders: Order[];
  currentOrder: Order | null;
  latestOrderId: string | null;
  activeOrders: Order[];
  notifications: NotificationItem[];
  addToCart: (menu: MenuDetail, selectedOptions: MenuOption[], quantity: number) => void;
  updateCartQuantity: (cartItemId: string, newQuantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  restoreCart: (items: CartItem[]) => void;
  createOrder: (paymentMethod?: string) => Promise<OrderDetailResponse>;
  getOrderById: (orderId: string) => Order | null;
  saveOrderToState: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  cartTotal: number;
  addNotification: (type: NotificationType, title: string, message: string, orderId: string) => void;
  markAsRead: (id: string) => void;
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

function readStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(NOTIFS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotificationItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isActiveStatus(status: OrderStatus): boolean {
  return status === "PREPARING" || status === "READY";
}

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(() => readStoredOrders());
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [latestOrderId, setLatestOrderId] = useState<string | null>(() => {
    const stored = readStoredOrders();
    return stored.length > 0 ? stored[stored.length - 1].orderId : null;
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => readStoredNotifications());

  // 주문별 앱 내 알림 중복 방지 (백그라운드 폴링용)
  const notifiedRef = useRef<Record<string, { preparing: boolean; ready: boolean; canceled: boolean }>>({});

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
    } catch {
      // ignore
    }
  }, [notifications]);

  const addNotification = useCallback(
    (type: NotificationType, title: string, message: string, orderId: string) => {
      const now = new Date();
      const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const newNotification: NotificationItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        orderId,
        createdAt: timeString,
        read: false,
      };
      setNotifications((prev) => {
        // 같은 주문·같은 유형 알림은 한 번만
        if (prev.some((n) => n.orderId === orderId && n.type === type)) {
          return prev;
        }
        return [newNotification, ...prev].slice(0, 50);
      });
    },
    [],
  );

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const generateCartItemId = (menuId: number, options: MenuOption[]): string => {
    const sortedOptionIds = [...options].map((o) => o.id).sort((a, b) => a - b);
    return `${menuId}-${sortedOptionIds.join("-")}`;
  };

  const addToCart = (menu: MenuDetail, selectedOptions: MenuOption[], quantity: number) => {
    const cartItemId = generateCartItemId(menu.id, selectedOptions);

    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => item.cartItemId === cartItemId);
      const optionsPrice = selectedOptions.reduce((sum, opt) => sum + opt.additionalPrice, 0);
      const singleItemPrice = menu.basePrice + optionsPrice;

      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        const existingItem = updatedCart[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;

        updatedCart[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          totalPrice: singleItemPrice * newQuantity,
        };
        return updatedCart;
      }

      const newItem: CartItem = {
        cartItemId,
        menuId: menu.id,
        menuName: menu.name,
        basePrice: menu.basePrice,
        imageUrl: menu.imageUrl,
        selectedOptions,
        quantity,
        totalPrice: singleItemPrice * quantity,
      };
      return [...prevCart, newItem];
    });
  };

  const updateCartQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.cartItemId === cartItemId) {
          const optionsPrice = item.selectedOptions.reduce((sum, opt) => sum + opt.additionalPrice, 0);
          const singleItemPrice = item.basePrice + optionsPrice;
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: singleItemPrice * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const restoreCart = (items: CartItem[]) => {
    setCart(items);
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

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
    setCurrentOrder(orderObj);
    setLatestOrderId(orderObj.orderId);
  }, []);

  const getOrderById = (orderId: string): Order | null => {
    const found = orders.find((o) => o.orderId === orderId);
    if (found) return found;
    if (currentOrder && currentOrder.orderId === orderId) return currentOrder;
    return null;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const update = (prevOrders: Order[]) =>
      prevOrders.map((o) => {
        if (o.orderId === orderId) {
          let count = o.waitingCount;
          let time = o.waitingTime;
          if (status === "READY" || status === "COMPLETED") {
            count = 0;
            time = 0;
          }
          return { ...o, status, waitingCount: count, waitingTime: time };
        }
        return o;
      });

    setOrders(update);
    if (currentOrder && currentOrder.orderId === orderId) {
      setCurrentOrder((prev) => {
        if (!prev) return null;
        let count = prev.waitingCount;
        let time = prev.waitingTime;
        if (status === "READY" || status === "COMPLETED") {
          count = 0;
          time = 0;
        }
        return { ...prev, status, waitingCount: count, waitingTime: time };
      });
    }
  };

  const activeOrders = useMemo(
    () => orders.filter((o) => isActiveStatus(o.status)),
    [orders],
  );

  const preparingOrderIdsKey = useMemo(
    () =>
      orders
        .filter((o) => o.status === "PREPARING")
        .map((o) => o.orderId)
        .sort()
        .join(","),
    [orders],
  );

  // 진행 중 주문 전체를 백그라운드에서 폴링 — 다른 주문 화면을 보더라도 알림 유지
  useEffect(() => {
    const preparingIds = preparingOrderIdsKey ? preparingOrderIdsKey.split(",") : [];
    if (preparingIds.length === 0) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      await Promise.all(
        preparingIds.map(async (id) => {
          try {
            const res = await orderService.getOrder(id);
            if (cancelled) return;
            const updated = mapOrderDetailToOrder(res);
            saveOrderToState(updated);

            if (!notifiedRef.current[id]) {
              notifiedRef.current[id] = { preparing: false, ready: false, canceled: false };
            }
            const flags = notifiedRef.current[id];

            if (updated.status === "PREPARING" && !flags.preparing) {
              addNotification(
                "PREPARING",
                "조리 시작",
                `${updated.pickupNumber}번 주문을 조리하고 있습니다.`,
                updated.orderId,
              );
              flags.preparing = true;
            }

            if ((updated.status === "READY" || updated.status === "COMPLETED") && !flags.ready) {
              addNotification(
                "READY",
                "준비 완료",
                `${updated.pickupNumber}번 주문이 준비되었습니다. 카운터에서 픽업해 주세요.`,
                updated.orderId,
              );
              flags.ready = true;
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
          } catch (err) {
            console.error(`진행 중 주문 폴링 실패 (id=${id}):`, err);
          }
        }),
      );
    };

    void poll();
    const intervalId = setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [preparingOrderIdsKey, saveOrderToState, addNotification]);

  return (
    <UserDataContext.Provider
      value={{
        cart,
        orders,
        currentOrder,
        latestOrderId,
        activeOrders,
        notifications,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        restoreCart,
        createOrder,
        getOrderById,
        saveOrderToState,
        updateOrderStatus,
        cartTotal,
        addNotification,
        markAsRead,
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
