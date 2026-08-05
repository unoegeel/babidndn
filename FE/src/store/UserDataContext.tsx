import React, { createContext, useContext, useState, useMemo } from "react";
import type { CartItem, MenuDetail, MenuOption, Order, OrderStatus, NotificationItem, NotificationType } from "../types/user";
import { orderService, type OrderDetailResponse } from "../services/user/orderService";

interface UserDataContextType {
  cart: CartItem[];
  orders: Order[];
  currentOrder: Order | null;
  latestOrderId: string | null;
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
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // 알림 추가 헬퍼
  const addNotification = (type: NotificationType, title: string, message: string, orderId: string) => {
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
    setNotifications((prev) => [newNotification, ...prev]);
  };

  // 알림 읽음 처리
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // 장바구니 고유 ID 생성 (menuId + 정렬된 옵션 ID들의 조합)
  const generateCartItemId = (menuId: number, options: MenuOption[]): string => {
    const sortedOptionIds = [...options].map((o) => o.id).sort((a, b) => a - b);
    return `${menuId}-${sortedOptionIds.join("-")}`;
  };

  // 장바구니 아이템 추가
  const addToCart = (menu: MenuDetail, selectedOptions: MenuOption[], quantity: number) => {
    const cartItemId = generateCartItemId(menu.id, selectedOptions);

    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => item.cartItemId === cartItemId);

      // 단일 품목의 총액 = (메뉴 기본가 + 선택한 옵션 추가금들의 합) * 수량
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
      } else {
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
      }
    });
  };

  // 장바구니 수량 수정
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

  // 장바구니 아이템 삭제
  const removeFromCart = (cartItemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.cartItemId !== cartItemId));
  };

  // 장바구니 비우기
  const clearCart = () => {
    setCart([]);
  };

  // 장바구니 복원
  const restoreCart = (items: CartItem[]) => {
    setCart(items);
  };

  // 장바구니 총합 계산
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  // 실제 API를 통한 주문 생성 (POST /api/orders)
  // 결제 전 임시 주문이므로 로컬 주문 내역에는 넣지 않습니다.
  const createOrder = async (): Promise<OrderDetailResponse> => {
    return orderService.createOrder(cart);
  };

  const saveOrderToState = (orderObj: Order) => {
    setOrders((prevOrders) => {
      const exists = prevOrders.some((o) => o.orderId === orderObj.orderId);
      if (exists) {
        return prevOrders.map((o) => (o.orderId === orderObj.orderId ? orderObj : o));
      }
      return [...prevOrders, orderObj];
    });
    setCurrentOrder(orderObj);
    setLatestOrderId(orderObj.orderId);
  };

  // 특정 주문 정보 조회 (로컬 state)
  const getOrderById = (orderId: string): Order | null => {
    const found = orders.find((o) => o.orderId === orderId);
    if (found) return found;
    if (currentOrder && currentOrder.orderId === orderId) return currentOrder;
    return null;
  };

  // 주문 상태 업데이트
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

  return (
    <UserDataContext.Provider
      value={{
        cart,
        orders,
        currentOrder,
        latestOrderId,
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
