export interface Product {
  isShopify?: boolean;
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  category: string;
  badge?: string;
  description?: string;
  seller?: string;
  inStock?: boolean;
  stock: number;
  sku: string;
  specifications?: Record<string, string>;
  status?: string;
  shopify_id?: string;
  sync_category?: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  count?: number;
}

export interface Reseller {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  shopName: string;
  email: string;
  password?: string;
  registrationDate: string;
  referredBy: string;
  staffName?: string;
  adminMember: string;
  memberOfAdminId?: string;
  hasRequestedPasswordReset: boolean;
  referralId?: string;
  level?: string;
  productLimit?: number;
  starRating?: number;
  creditScore?: number;
  selectedProductIds?: string[];
  resellerId?: number;
  status?: 'Active' | 'Inactive' | 'Deactivated';
  // Financial fields
  balance: number;
  pendingBalance: number;
  unpickedBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalEarnings: number;
  totalOrders: number;
  bankInfo?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  };
  usdtAddress?: string;
}

export type OrderStatus = "Pending" | "Ongoing" | "Completed" | "Cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number; // Base price (service cost per unit)
  adjustedPrice: number; // Customer price per unit
  qty: number;
}

export interface Order {
  id: string;
  orderId: string;
  resellerId: string;
  resellerName: string;
  items: OrderItem[];
  totalCost: number; // Total customer price
  serviceCost: number; // Total base price (what reseller pays)
  profit: number; // Reseller profit (totalCost - serviceCost)
  status: OrderStatus;
  createdAt: string;
  shippingAddress: string;
  profileName: string; // Customer name
}
