import React, { useReducer, useEffect, type ReactNode } from "react";
import type { Product } from "./types";
import { WishlistContext, type WishlistContextType } from "./wishlist-context-hooks";

type WishlistAction =
  | { type: "ADD"; product: Product }
  | { type: "REMOVE"; productId: string }
  | { type: "CLEAR" }
  | { type: "LOAD"; items: Product[] };

function wishlistReducer(state: Product[], action: WishlistAction): Product[] {
  switch (action.type) {
    case "LOAD":
      return action.items;
    case "ADD": {
      if (state.find((p) => p.id === action.product.id)) return state;
      return [...state, action.product];
    }
    case "REMOVE":
      return state.filter((p) => p.id !== action.productId);
    case "CLEAR":
      return [];
    default:
      return state;
  }
}


export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(wishlistReducer, [], () => {
    try {
      const saved = localStorage.getItem("vanillahub-wishlist");
      return saved ? (JSON.parse(saved) as Product[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("vanillahub-wishlist", JSON.stringify(items));
  }, [items]);

  const addToWishlist = (product: Product) => dispatch({ type: "ADD", product });
  const removeFromWishlist = (productId: string) => dispatch({ type: "REMOVE", productId });
  const isInWishlist = (productId: string) => items.some((p) => p.id === productId);
  const clearWishlist = () => dispatch({ type: "CLEAR" });

  return (
    <WishlistContext.Provider value={{ items, totalItems: items.length, addToWishlist, removeFromWishlist, isInWishlist, clearWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

