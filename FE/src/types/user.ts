export type SaleStatus = "AVAILABLE" | "SOLDOUT";
export type MenuBadge = "NONE" | "POPULAR" | "BEST" | "RECOMMENDED";
export type GroupType = "SIZE" | "TOPPING_ADD" | "TOPPING_REMOVE" | null;

export interface MenuOption {
  id: number;
  groupType: GroupType;
  name: string;
  additionalPrice: number;
  maxQuantity: number;
  defaultSelected: boolean;
  displayOrder: number;
}

export interface MenuSummary {
  id: number;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  displayOrder: number;
  saleStatus: SaleStatus;
  badge: MenuBadge;
}

export interface MenuCategory {
  categoryId: number;
  categoryName: string;
  displayOrder: number;
  menus: MenuSummary[];
}

export interface MenuDetail {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  displayOrder: number;
  saleStatus: SaleStatus;
  badge: MenuBadge;
  /** 토핑 선택 가능 여부 (false 이면 옵션 시트 없이 바로 담기) */
  toppingEnabled?: boolean;
  options: MenuOption[];
}

export interface CartItem {
  cartItemId: string; // 고유 식별자 (menuId + 정렬된 선택 옵션 id 조합)
  menuId: number;
  menuName: string;
  basePrice: number;
  imageUrl: string | null;
  selectedOptions: MenuOption[];
  quantity: number;
  totalPrice: number; // 단일 품목 (기본가 + 옵션가) * 수량
}

export type OrderStatus = "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELED";

export interface Order {
  orderId: string;
  items: CartItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  /** 서버 updatedAt — 호출/재호출 감지용 */
  updatedAt?: string;
  pickupNumber: string;
  waitingCount: number;
  waitingTime: number;
}

export type NotificationType = "ORDER_CREATED" | "PREPARING" | "READY" | "CANCELED";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId: string;
  /** 화면 표시용 HH:mm */
  createdAt: string;
  /** 만료·정렬용 epoch ms */
  createdAtMs?: number;
  read: boolean;
}
