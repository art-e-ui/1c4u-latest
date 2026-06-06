import { createContext } from "react";

export interface ProductSyncContextType {
  isSyncing: boolean;
  lastSync: Date | null;
  syncNow: () => Promise<void>;
  nextSync: Date | null;
  syncUrl: string;
  setSyncUrl: (url: string) => void;
}

export const ProductSyncContext = createContext<ProductSyncContextType | undefined>(undefined);
