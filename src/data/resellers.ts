import { Reseller } from "@/lib/types";

export const STATIC_RESELLERS: Reseller[] = [
  {
    id: "R20551",
    referredBy: "admin_john",
    adminMember: "admin_jane",
    name: "Ahmad Fauzi",
    firstName: "Ahmad",
    lastName: "Fauzi",
    registrationDate: "2026-01-15",
    email: "ahmad.fauzi@example.com",
    password: "password123",
    hasRequestedPasswordReset: true,
    shopName: "Ahmad's General Store",
    level: "1",
    selectedProductIds: []
  },
  {
    id: "R20552",
    referredBy: "admin_jane",
    adminMember: "admin_bob",
    name: "Maria Santos",
    firstName: "Maria",
    lastName: "Santos",
    registrationDate: "2026-02-01",
    email: "maria.santos@example.com",
    password: "securepassword",
    hasRequestedPasswordReset: false,
    shopName: "Maria's Boutique",
    level: "2",
    selectedProductIds: []
  }
];
