import type { MenuOption } from "../../types/user";
import { trackEvent } from "./trackEvent";

export function trackMenuView(menuId: number, categoryId: number): void {
  trackEvent({
    type: "MENU_VIEW",
    metadata: { menuId, categoryId },
  });
}

export function trackMenuOptionOpen(menuId: number, categoryId: number): void {
  trackEvent({
    type: "MENU_OPTION_OPEN",
    metadata: { menuId, categoryId },
  });
}

export function trackOptionSelected(menuId: number, option: MenuOption, quantity = 1): void {
  trackEvent({
    type: "OPTION_SELECTED",
    metadata: {
      menuId,
      optionId: option.id,
      optionGroup: option.groupType ?? "NONE",
      quantity,
      additionalPrice: option.additionalPrice,
    },
  });
}

export function trackAddToCart(menuId: number, quantity: number, cartItemCount: number): void {
  trackEvent({
    type: "ADD_TO_CART",
    metadata: { menuId, quantity, cartItemCount },
  });
}

export function trackCartItemUpdated(menuId: number, quantity: number, cartItemCount: number): void {
  trackEvent({
    type: "CART_ITEM_UPDATED",
    metadata: { menuId, quantity, cartItemCount },
  });
}

export function trackCartItemRemoved(menuId: number, cartItemCount: number): void {
  trackEvent({
    type: "CART_ITEM_REMOVED",
    metadata: { menuId, cartItemCount },
  });
}

export function trackOrderCreated(
  orderId: number,
  amount: number,
  relatedRequestId?: string,
): void {
  trackEvent({
    type: "ORDER_CREATED",
    metadata: { orderId, amount },
    relatedRequestId,
  });
}

export function trackPaymentSuccess(orderId: number | string, amount?: number): void {
  trackEvent({
    type: "PAYMENT_SUCCESS",
    metadata: {
      orderId: typeof orderId === "string" ? Number(orderId) : orderId,
      ...(amount != null ? { amount } : {}),
    },
  });
}

export function trackPaymentFail(code: string): void {
  trackEvent({
    type: "PAYMENT_FAIL",
    metadata: { code },
  });
}

export function trackOrderStatusView(orderId: string, orderStatus: string): void {
  trackEvent({
    type: "ORDER_STATUS_VIEW",
    metadata: { orderId: Number(orderId), orderStatus },
  });
}

export function trackOrderCompleted(orderId: string): void {
  trackEvent({
    type: "ORDER_COMPLETED",
    metadata: { orderId: Number(orderId) },
  });
}

export function trackSavedMenuCreated(savedMenuId: number, menuId: number): void {
  trackEvent({
    type: "SAVED_MENU_CREATED",
    metadata: { savedMenuId, menuId },
  });
}

export function trackSavedMenuUpdated(savedMenuId: number): void {
  trackEvent({
    type: "SAVED_MENU_UPDATED",
    metadata: { savedMenuId },
  });
}

export function trackSavedMenuDeleted(savedMenuId: number): void {
  trackEvent({
    type: "SAVED_MENU_DELETED",
    metadata: { savedMenuId },
  });
}

export function trackSavedMenuReorder(savedMenuId: number, menuId: number): void {
  trackEvent({
    type: "SAVED_MENU_REORDER",
    metadata: { savedMenuId, menuId },
  });
}

export function trackSavedMenuView(itemCount: number): void {
  trackEvent({
    type: "SAVED_MENU_VIEW",
    metadata: { itemCount },
  });
}

export function trackReviewSubmitted(): void {
  trackEvent({ type: "REVIEW_SUBMITTED" });
}

export function trackContactSubmitted(): void {
  trackEvent({ type: "CONTACT_SUBMITTED" });
}

export function trackCartView(cartItemCount: number): void {
  trackEvent({
    type: "CART_VIEW",
    metadata: { cartItemCount },
  });
}

export function trackCheckoutView(cartItemCount: number, amount: number): void {
  trackEvent({
    type: "CHECKOUT_VIEW",
    metadata: { cartItemCount, amount },
  });
}

export function trackPaymentStart(orderId: number, amount: number, paymentMethod: string): void {
  trackEvent({
    type: "PAYMENT_START",
    metadata: { orderId, amount, paymentMethod },
  });
}
