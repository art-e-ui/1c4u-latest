import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { RoleGuard } from "@/components/admin/RoleGuard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrdersPage from "@/pages/admin/AdminOrdersPage";
import AdminInventoryPage from "@/pages/admin/AdminInventoryPage";
import AdminCustomersPage from "@/pages/admin/AdminCustomersPage";
import ACHCustomersPage from "@/pages/admin/ACHCustomersPage";
import ACHFinancialPage from "@/pages/admin/ACHFinancialPage";
import AdminResellersPage from "@/pages/admin/AdminResellersPage";
import AdminAdminsPage from "@/pages/admin/AdminAdminsPage";
import AdminMessengerPage from "@/pages/admin/AdminMessengerPage";
import AdminAuditLogsPage from "@/pages/admin/AdminAuditLogsPage";
import AdminAlertsPage from "@/pages/admin/AdminAlertsPage";
import AdminSignIn from "@/pages/admin/AdminSignIn";
import AdminForgotPassword from "@/pages/admin/AdminForgotPassword";
import SLASystemPage from "@/pages/admin/SLASystemPage";
import SLAAdministratorPage from "@/pages/admin/SLAAdministratorPage";
import SLAUserPage from "@/pages/admin/SLAUserPage";
import SLAOwnershipPage from "@/pages/admin/SLAOwnershipPage";
import ContentManagementPage from "@/pages/admin/ContentManagementPage";
import {
  RolesPage,
  SecurityPage,
  SystemLogsPage,
} from "@/pages/admin/AdminPlaceholderPages";
import ARSRetailShopsPage from "@/pages/admin/ARSRetailShopsPage";
import ARSTrackOrdersPage from "@/pages/admin/ARSTrackOrdersPage";
import SiteFrontAdvertisingPage from "@/pages/admin/SiteFrontAdvertisingPage";
import BroadcastNewsPage from "@/pages/admin/BroadcastNewsPage";
import CustomerServicePage from "@/pages/admin/CustomerServicePage";
import Reseller2AdminPage from "@/pages/admin/Reseller2AdminPage";
import ARSPaymentInfoPage from "@/pages/admin/ARSPaymentInfoPage";
import ARSDepositPage from "@/pages/admin/ARSDepositPage";
import ARSWithdrawalPage from "@/pages/admin/ARSWithdrawalPage";
import SQCVirtualProfilePage from "@/pages/admin/SQCVirtualProfilePage";
import SQCVirtualOrdersPage from "@/pages/admin/SQCVirtualOrdersPage";
import ResellerProfilePage from "@/pages/admin/ResellerProfilePage";
import VirtualCustomerServicesPage from "@/pages/admin/VirtualCustomerServicesPage";
import VirtualOrderServicesPage from "@/pages/admin/VirtualOrderServicesPage";

export function AdminPortal() {
  return (
    <Routes>
      {/* Auth routes (no sidebar) */}
      <Route path="auth/sign-in" element={<AdminSignIn />} />
      <Route path="auth/forgot-password" element={<AdminForgotPassword />} />

      {/* Dashboard routes - all relative paths */}
      <Route index element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="orders" element={<AdminLayout><AdminOrdersPage /></AdminLayout>} />
      <Route path="inventory" element={<AdminLayout><AdminInventoryPage /></AdminLayout>} />
      <Route path="customers" element={<AdminLayout><AdminCustomersPage /></AdminLayout>} />
      <Route path="ach/customers" element={<AdminLayout><ACHCustomersPage /></AdminLayout>} />
      <Route path="ach/financial" element={<AdminLayout><ACHFinancialPage /></AdminLayout>} />
      <Route path="resellers" element={<AdminLayout><AdminResellersPage /></AdminLayout>} />
      <Route path="content" element={<AdminLayout><ContentManagementPage /></AdminLayout>} />
      <Route path="sla/site-advertising" element={<AdminLayout><SiteFrontAdvertisingPage /></AdminLayout>} />
      <Route path="sla/broadcast-news" element={<AdminLayout><BroadcastNewsPage /></AdminLayout>} />
      <Route path="customer-service" element={<AdminLayout><CustomerServicePage /></AdminLayout>} />
      <Route path="sla/reseller-2-admin" element={<RoleGuard path="/admin/sla/reseller-2-admin"><AdminLayout><Reseller2AdminPage /></AdminLayout></RoleGuard>} />
      <Route path="customer-care/virtual-services" element={<AdminLayout><VirtualCustomerServicesPage /></AdminLayout>} />
      <Route path="customer-care/order-services" element={<AdminLayout><VirtualOrderServicesPage /></AdminLayout>} />
      <Route path="sla/sqc-orders" element={<AdminLayout><SQCVirtualOrdersPage /></AdminLayout>} />
      <Route path="customer-care/staffs" element={<AdminLayout><SLAUserPage /></AdminLayout>} />
      <Route path="customer-care/reseller-profile" element={<AdminLayout><ResellerProfilePage /></AdminLayout>} />
      <Route path="admins" element={<RoleGuard path="/admin/admins"><AdminLayout><AdminAdminsPage /></AdminLayout></RoleGuard>} />
      <Route path="messenger" element={<AdminLayout><AdminMessengerPage /></AdminLayout>} />
      <Route path="roles" element={<AdminLayout><RolesPage /></AdminLayout>} />
      <Route path="audit-logs" element={<AdminLayout><AdminAuditLogsPage /></AdminLayout>} />
      <Route path="security" element={<AdminLayout><SecurityPage /></AdminLayout>} />
      <Route path="sla/ownership" element={<RoleGuard path="/admin/sla/ownership"><AdminLayout><SLAOwnershipPage /></AdminLayout></RoleGuard>} />
      <Route path="sla/administrator" element={<RoleGuard path="/admin/sla/administrator"><AdminLayout><SLAAdministratorPage /></AdminLayout></RoleGuard>} />
      <Route path="sla/staff" element={<AdminLayout><SLAUserPage /></AdminLayout>} />
      <Route path="system" element={<AdminLayout><SLASystemPage /></AdminLayout>} />
      <Route path="alerts" element={<AdminLayout><AdminAlertsPage /></AdminLayout>} />
      <Route path="system-logs" element={<AdminLayout><SystemLogsPage /></AdminLayout>} />
      <Route path="ars/retail-shops" element={<AdminLayout><ARSRetailShopsPage /></AdminLayout>} />
      <Route path="ars/orders" element={<AdminLayout><ARSTrackOrdersPage /></AdminLayout>} />
      <Route path="ars/payment-info" element={<RoleGuard path="/admin/ars/payment-info"><AdminLayout><ARSPaymentInfoPage /></AdminLayout></RoleGuard>} />
      <Route path="ars/deposit" element={<RoleGuard path="/admin/ars/deposit"><AdminLayout><ARSDepositPage /></AdminLayout></RoleGuard>} />
      <Route path="ars/withdrawal" element={<RoleGuard path="/admin/ars/withdrawal"><AdminLayout><ARSWithdrawalPage /></AdminLayout></RoleGuard>} />

      {/* Catch-all → sign in */}
      <Route path="*" element={<Navigate to="auth/sign-in" replace />} />
    </Routes>
  );
}
