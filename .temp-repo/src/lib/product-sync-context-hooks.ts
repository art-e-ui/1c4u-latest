import { useContext } from "react";
import { ProductSyncContext } from "./product-sync-context";

export function useProductSync() {
  const context = useContext(ProductSyncContext);
  if (context === undefined) {
    throw new Error("useProductSync must be used within a ProductSyncProvider");
  }
  return context;
}
