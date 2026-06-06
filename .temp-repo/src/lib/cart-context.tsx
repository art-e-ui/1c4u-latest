import React, { useReducer, useEffect, type ReactNode } from "react";
import type { Product } from "./types";
import { CartContext, type CartItem, type CartAction } from "./cart-context-hooks";

export interface CartState {
  items: CartItem[];
  resellerId: string | null;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "LOAD_CART":
      return action.state;
    case "ADD_ITEM": {
      // If adding from a different reseller, clear the cart first (or handle as needed)
      // For simplicity, we'll just allow one reseller at a time in the cart
      const newResellerId = action.resellerId || state.resellerId;
      const items = (state.resellerId && action.resellerId && state.resellerId !== action.resellerId) 
        ? [] 
        : state.items;

      const existing = items.find((item) => item.product.id === action.product.id);
      let newItems;
      if (existing) {
        newItems = items.map((item) =>
          item.product.id === action.product.id
            ? { ...item, quantity: item.quantity + (action.quantity || 1) }
            : item
        );
      } else {
        newItems = [...items, { product: action.product, quantity: action.quantity || 1 }];
      }
      return { items: newItems, resellerId: newResellerId };
    }
    case "REMOVE_ITEM": {
      const newItems = state.items.filter((item) => item.product.id !== action.productId);
      return { ...state, items: newItems, resellerId: newItems.length === 0 ? null : state.resellerId };
    }
    case "UPDATE_QUANTITY": {
      if (action.quantity <= 0) {
        const newItems = state.items.filter((item) => item.product.id !== action.productId);
        return { ...state, items: newItems, resellerId: newItems.length === 0 ? null : state.resellerId };
      }
      const newItems = state.items.map((item) =>
        item.product.id === action.productId ? { ...item, quantity: action.quantity } : item
      );
      return { ...state, items: newItems };
    }
    case "CLEAR_CART":
      return { items: [], resellerId: null };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], resellerId: null }, () => {
    try {
      const saved = localStorage.getItem("vanillahub-cart-state");
      return saved ? (JSON.parse(saved) as CartState) : { items: [], resellerId: null };
    } catch {
      return { items: [], resellerId: null };
    }
  });

  useEffect(() => {
    localStorage.setItem("vanillahub-cart-state", JSON.stringify(state));
  }, [state]);

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const addItem = (product: Product, quantity?: number, resellerId?: string) => 
    dispatch({ type: "ADD_ITEM", product, quantity, resellerId });
  const removeItem = (productId: string) => dispatch({ type: "REMOVE_ITEM", productId });
  const updateQuantity = (productId: string, quantity: number) => 
    dispatch({ type: "UPDATE_QUANTITY", productId, quantity });
  const clearCart = () => dispatch({ type: "CLEAR_CART" });

  return (
    <CartContext.Provider value={{ 
      items: state.items, 
      resellerId: state.resellerId,
      totalItems, 
      totalPrice, 
      addItem, 
      removeItem, 
      updateQuantity, 
      clearCart 
    }}>
      {children}
    </CartContext.Provider>
  );
}
