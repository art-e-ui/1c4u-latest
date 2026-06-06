import { Routes, Route, Navigate } from "react-router-dom";
import ResellerLayout from "@/components/reseller/ResellerLayout";
import ResellerDashboard from "@/pages/reseller/ResellerDashboard";
import ResellerShop from "@/pages/reseller/ResellerShop";
import ResellerOrders from "@/pages/reseller/ResellerOrders";
import ResellerProfile from "@/pages/reseller/ResellerProfile";
import ResellerMessages from "@/pages/reseller/ResellerMessages";
import ResellerLogin from "@/pages/reseller/ResellerLogin";
import ResellerRegister from "@/pages/reseller/ResellerRegister";
import ResellerForgotPassword from "@/pages/reseller/ResellerForgotPassword";
import ResellerShopCustomization from "@/pages/reseller/ResellerShopCustomization";
import AdBoostService from "@/pages/reseller/AdBoostService";
import ResellerShareTarget from "@/pages/reseller/ResellerShareTarget";
import ResellerAnnouncements from "@/pages/reseller/ResellerAnnouncements";

export function ResellerPortal() {
  return (
    <Routes>
      {/* Auth routes (no layout) */}
      <Route path="login" element={<ResellerLogin />} />
      <Route path="register" element={<ResellerRegister />} />
      <Route path="auth/forgot-password" element={<ResellerForgotPassword />} />
      <Route path="share-target" element={<ResellerShareTarget />} />

      {/* Dashboard routes */}
      <Route
        path="*"
        element={
          <ResellerLayout>
            <Routes>
              <Route path="dashboard" element={<ResellerDashboard />} />
              <Route path="shop" element={<ResellerShop />} />
              <Route path="orders" element={<ResellerOrders />} />
              <Route path="messages" element={<ResellerMessages />} />
              <Route path="profile" element={<ResellerProfile />} />
              <Route path="profile/customize" element={<ResellerShopCustomization />} />
              <Route path="ad-boost" element={<AdBoostService />} />
              <Route path="announcements" element={<ResellerAnnouncements />} />
              <Route path="*" element={<Navigate to="login" replace />} />
            </Routes>
          </ResellerLayout>
        }
      />
    </Routes>
  );
}
