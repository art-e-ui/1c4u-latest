import { Routes, Route } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Index from "@/pages/Index";
import Categories from "@/pages/Categories";
import CategoryDetail from "@/pages/CategoryDetail";
import ProductDetail from "@/pages/ProductDetail";
import ShopifyProductDetail from "@/pages/ShopifyProductDetail";
import Cart from "@/pages/Cart";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ResellerStorefront from "@/pages/ResellerStorefront";
import Account from "@/pages/Account";
import Orders from "@/pages/Orders";
import NotFound from "@/pages/NotFound";

export function CustomerPortal() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/:slug" element={<CategoryDetail />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/product/:handle" element={<ShopifyProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/cart/login" element={<Login />} />
        <Route path="/cart/register" element={<Register />} />
        <Route path="/store/:slug" element={<ResellerStorefront />} />
        <Route path="/account" element={<Account />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  );
}
