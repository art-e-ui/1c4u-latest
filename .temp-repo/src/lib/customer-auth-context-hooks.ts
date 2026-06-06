import { createContext, useContext } from "react";

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  customerId: string;
}

export interface CustomerAuthContextType {
  user: CustomerUser | null;
  isAuthenticated: boolean;
  login: (emailOrPhone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, emailOrPhone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

export const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
