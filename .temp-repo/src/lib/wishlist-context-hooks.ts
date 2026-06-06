import { createContext, useContext } from "react";
import type { Product } from "./types";

export interface WishlistContextType {
  items: Product[];
  totalItems: number;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within a WishlistProvider");
  return context;
}
