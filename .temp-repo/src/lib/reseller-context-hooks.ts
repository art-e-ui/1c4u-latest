import { createContext, useContext } from "react";
import { type Product } from "./types";

export type StoreTheme = "minimal" | "bold" | "elegant" | "vibrant";

export interface ResellerProfile {
  id: string;          // GRID – internal referral-based code
  resellerId: number;  // public-facing Reseller ID (shown as UID to resellers)
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  shopName: string;
  shopLogo: string;
  shopHeroBanner: string;
  shopSlug?: string;
  storeTheme: StoreTheme;
  level: string;
  verified: boolean;
  balance: number;
  pendingBalance: number;
  unpickedBalance: number;
  guaranteeBalance: number;
  totalEarnings: number;
  totalOrders: number;
  totalDeposits: number;
  pendingOrders: number;
  selectedProductIds: string[];
  usdtAddress?: string;
  bankInfo?: { bankName: string; accountName: string; accountNumber: string };
  joinedAt: string;
  shopLevel?: string;
  storeRating?: number;
  creditLimit?: number;
  creditScore?: number;
  productLimit?: number;
  starRating?: number;
  referralCode?: string;
  referredByStaffId?: string;
  memberOfAdminId?: string;
}

export interface ResellerContextType {
  reseller: ResellerProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: { firstName: string; lastName: string; emailOrPhone: string; password: string; shopName?: string; referralCode?: string; isPhone?: boolean; phoneCredential?: import("firebase/auth").UserCredential }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<ResellerProfile>) => void;
  toggleProduct: (productId: string) => Promise<{ success: boolean; errorType?: 'limit' | 'permission' | 'error' }>;
  getMyProducts: () => Product[];
  getResellerBySlug: (slug: string) => ResellerProfile | null;
  fetchResellerBySlug: (slug: string) => Promise<ResellerProfile | null>;
  fetchResellerByName: (name: string) => Promise<ResellerProfile | null>;
}

export const LEVEL_PROFIT_MAP: Record<string, number> = {
  "VIP-0": 0.15,
  "VIP-1": 0.20,
  "VIP-2": 0.25,
  "VIP-3": 0.30,
  "VIP-4": 0.35,
  "VIP-5": 0.40,
};

export interface LevelRequirement {
  level: string;
  profitMargin: number;
  productLimit: number;
  depositRequirement: number;
}

export const VIP_LEVELS: LevelRequirement[] = [
  { level: "VIP-0", profitMargin: 0.15, productLimit: 20, depositRequirement: 0 },
  { level: "VIP-1", profitMargin: 0.20, productLimit: 30, depositRequirement: 1000 },
  { level: "VIP-2", profitMargin: 0.25, productLimit: 40, depositRequirement: 5000 },
  { level: "VIP-3", profitMargin: 0.30, productLimit: 50, depositRequirement: 10000 },
  { level: "VIP-4", profitMargin: 0.35, productLimit: 100, depositRequirement: 50000 },
  { level: "VIP-5", profitMargin: 0.40, productLimit: 150, depositRequirement: 100000 },
];

export function getLevelByDeposit(netDeposit: number, currentLevelLabel: string = "VIP-0"): LevelRequirement {
  const currentLevelNum = Number(currentLevelLabel.replace("VIP-", "")) || 0;
  
  let metLevelIndex = 0;
  for (let i = VIP_LEVELS.length - 1; i >= 0; i--) {
    if (netDeposit >= VIP_LEVELS[i].depositRequirement) {
      metLevelIndex = i;
      break;
    }
  }
  
  const newLevelIndex = Math.max(currentLevelNum, metLevelIndex);
  return VIP_LEVELS[newLevelIndex];
}

export const ResellerContext = createContext<ResellerContextType | undefined>(undefined);

export function useReseller() {
  const context = useContext(ResellerContext);
  if (!context) throw new Error("useReseller must be used within ResellerProvider");
  return context;
}
