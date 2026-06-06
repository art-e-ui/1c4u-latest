import { createContext, useContext } from "react";
import type { Product } from "./types";

export interface CartItem {
  product: Product;
  quantity: number;
}

export type CartAction =
  | { type: "ADD_ITEM"; product: Product; quantity?: number; resellerId?: string }
  | { type: "REMOVE_ITEM"; productId: string }
  | { type: "UPDATE_QUANTITY"; productId: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; state: { items: CartItem[]; resellerId: string | null } };

export interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  resellerId: string | null;
  addItem: (product: Product, quantity?: number, resellerId?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
