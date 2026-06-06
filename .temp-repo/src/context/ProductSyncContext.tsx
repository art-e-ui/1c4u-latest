import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { ProductSyncContext } from "@/lib/product-sync-context";
import { useProductMutations } from "@/hooks/use-db-products";

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes (matches cron schedule)

export function ProductSyncProvider({ children }: { children: React.ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [nextSync, setNextSync] = useState<Date | null>(new Date(Date.now() + SYNC_INTERVAL));
  const [syncUrl, setSyncUrl] = useState<string>(() => {
    try { return localStorage.getItem("inventory_sync_url") || ""; } catch { return ""; }
  });
  const queryClient = useQueryClient();
  const isSyncingRef = useRef(false);
  const { bulkSyncProducts } = useProductMutations();

  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (!syncUrl) {
      toast({
        title: "Sync URL Missing",
        description: "Please configure a data source URL in settings first.",
        variant: "destructive",
      });
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      // 1. Scrape products from the URL
      const scrapeResponse = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: syncUrl }),
      });

      if (!scrapeResponse.ok) {
        const errorData = await scrapeResponse.json();
        throw new Error(errorData.error || "Failed to scrape products from URL");
      }

      const { products } = await scrapeResponse.json();

      if (!products || products.length === 0) {
        throw new Error("No products found at the provided URL.");
      }

      // 2. Sync products to Firestore using client-side mutation
      await bulkSyncProducts.mutateAsync(products);

      setLastSync(new Date());
      setNextSync(new Date(Date.now() + SYNC_INTERVAL));

      toast({
        title: "Sync Successful",
        description: `Successfully synced ${products.length} products from ${new URL(syncUrl).hostname}.`,
      });
    } catch (error) {
      console.error("Sync failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not sync products.";
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [syncUrl, bulkSyncProducts]);

  // Persist sync URL
  useEffect(() => {
    if (syncUrl) {
      try { localStorage.setItem("inventory_sync_url", syncUrl); } catch { /* ignore */ }
    }
  }, [syncUrl]);

  // Countdown timer for next sync display (cron handles actual sync server-side)
  useEffect(() => {
    const interval = setInterval(() => {
      setNextSync(new Date(Date.now() + SYNC_INTERVAL));
    }, SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProductSyncContext.Provider value={{ isSyncing, lastSync, syncNow, nextSync, syncUrl, setSyncUrl }}>
      {children}
    </ProductSyncContext.Provider>
  );
}

