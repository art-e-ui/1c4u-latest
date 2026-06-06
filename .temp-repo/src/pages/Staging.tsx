import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Store, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Staging() {
  const handleSwitch = (portal: "customer" | "reseller" | "admin") => {
    localStorage.setItem("dev_portal_override", portal);
    window.location.href = portal === "admin" ? "/admin" : portal === "reseller" ? "/reseller" : "/";
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          GlobalCart Online Shop
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Welcome to the staging environment. Explore the three distinct portals and their current working features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Customer Portal */}
        <Card className="flex flex-col h-full border-primary/20 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl">Customer Portal</CardTitle>
            <CardDescription>
              The main storefront for end-users to browse and purchase products.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-3 flex-1 mb-6">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Working Features</h4>
              <ul className="space-y-2">
                {["Product Catalog & Categories", "Shopping Cart & Checkout", "User Authentication", "Order History & Tracking", "Wishlist Management", "Reseller Storefronts", "Multi-language Support"].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button onClick={() => handleSwitch("customer")} className="w-full group">
              Enter Customer Portal
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* Reseller Portal */}
        <Card className="flex flex-col h-full border-primary/20 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
              <Store className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl">Reseller Portal</CardTitle>
            <CardDescription>
              Dashboard for resellers to manage their custom storefronts and sales.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-3 flex-1 mb-6">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Working Features</h4>
              <ul className="space-y-2">
                {["Store Customization", "Sales Dashboard & Analytics", "Order Management", "Ad Boost Services", "Financials (Deposit/Withdrawal)", "Customer Messaging", "Shop Reputation Tracking"].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button onClick={() => handleSwitch("reseller")} variant="secondary" className="w-full group">
              Enter Reseller Portal
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        {/* Admin Portal */}
        <Card className="flex flex-col h-full border-primary/20 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl">Admin Portal</CardTitle>
            <CardDescription>
              Centralized management system for platform administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-3 flex-1 mb-6">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Working Features</h4>
              <ul className="space-y-2">
                {["Platform Dashboard", "Inventory Management", "User & Reseller Management", "SLA System Configuration", "ARS Tracking & Financials", "Audit Logs & Security", "Content Management"].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button onClick={() => handleSwitch("admin")} variant="outline" className="w-full group">
              Enter Admin Portal
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
