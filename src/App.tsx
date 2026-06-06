import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { ResellerProvider } from "@/lib/reseller-context";
import { CustomerAuthProvider } from "@/lib/customer-auth-context";
import { AdminAuthProvider } from "@/lib/admin-auth-context";
import { detectPortal, isAppModeDriven } from "@/lib/subdomain";
import { ProductsProvider } from "@/lib/products-context";
import { ProductSyncProvider } from "@/context/ProductSyncContext";
import { SeasonalThemeProvider } from "@/lib/seasonal-theme-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useCartSync } from "@/hooks/useCartSync";
import { getDocFromServer, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import ContactUs from "@/pages/ContactUs";
import AboutUs from "@/pages/AboutUs";
import Staging from "@/pages/Staging";
import ResetPassword from "@/pages/ResetPassword";
import ForgotPassword from "@/pages/ForgotPassword";

// Portals
import { AdminPortal } from "./portals/AdminPortal";
import { ResellerPortal } from "./portals/ResellerPortal";
import { CustomerPortal } from "./portals/CustomerPortal";

import { getAuth, onAuthStateChanged } from "firebase/auth";

const queryClient = new QueryClient();

const App = () => {
  useCartSync();
  const portal = detectPortal();
  const locked = isAppModeDriven();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdTokenResult();
        console.log("Auth state: Logged in as", user.email, "UID:", user.uid);
        console.log("Auth Claims:", idToken.claims);
      } else {
        console.log("Auth state: Logged out");
      }
    }, (error) => {
      console.error("Auth Error:", error);
      if (error.message.includes("unauthorized-domain")) {
        console.warn("IMPORTANT: This domain is not authorized in Firebase. Please add it to 'Authorized domains' in Firebase Console -> Authentication -> Settings.");
      }
    });
    return () => unsubscribe();
  }, []);

  /**
   * When VITE_PORTAL is set (separate deployment), only the target portal
   * is mounted at root "/". All paths are handled by that single portal.
   *
   * When not set (unified / dev), all portals mount at their prefixed paths.
   */
  const renderRoutes = () => {
    if (locked) {
      switch (portal) {
        case "admin":
          return (
            <Routes>
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/*" element={<AdminAuthProvider><AdminPortal /></AdminAuthProvider>} />
            </Routes>
          );
        case "reseller":
          return (
            <Routes>
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/*" element={<ResellerPortal />} />
            </Routes>
          );
        case "customer":
        default:
          return (
            <Routes>
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/*" element={<CustomerAuthProvider><CustomerPortal /></CustomerAuthProvider>} />
            </Routes>
          );
      }
    }

    // Unified deployment: all portals at their prefixed paths
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/admin/*" element={<AdminAuthProvider><AdminPortal /></AdminAuthProvider>} />
        <Route path="/reseller/*" element={<ResellerPortal />} />
        <Route path="/*" element={<CustomerAuthProvider><CustomerPortal /></CustomerAuthProvider>} />
      </Routes>
    );
  };

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ProductsProvider>
            <ProductSyncProvider>
              <CartProvider>
                <WishlistProvider>
                  <ResellerProvider>
                    <SeasonalThemeProvider>
                      <Toaster />
                      <Sonner />
                      <BrowserRouter>
                        {renderRoutes()}
                      </BrowserRouter>
                    </SeasonalThemeProvider>
                  </ResellerProvider>
                </WishlistProvider>
              </CartProvider>
            </ProductSyncProvider>
          </ProductsProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
