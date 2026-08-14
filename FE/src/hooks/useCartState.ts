import { useMemo, useState } from "react";
import type { CartItem, MenuDetail, MenuOption } from "../types/user";

/**
 * 장바구니 상태와 순수 Cart action만 담당한다.
 * Order 생성·persistence·알림과는 연결하지 않는다.
 */
export function useCartState() {
  const [cart, setCart] = useState<CartItem[]>([]);

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

  const removeFromCart = (cartItemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.cartItemId !== cartItemId));
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
      }),
    );
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

  return {
    cart,
    cartTotal,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    restoreCart,
  };
}
