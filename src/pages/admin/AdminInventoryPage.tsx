import { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import { onSnapshot, doc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useUnifiedResellers } from "@/lib/unified-hooks";
import { useDbProducts, dbProductToInventory, type InventoryRow, useProductMutations } from "@/hooks/use-db-products";
import { useProductSync } from "@/lib/product-sync-context-hooks";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { 
  Search, Package, AlertTriangle, CheckCircle, MoreVertical, 
  ShoppingBag, Users, FolderOpen, Globe, Download,
  RefreshCw, Clock, Settings, FileText, Plus, Upload, Trash2, Edit, ShoppingCart
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { parseImageUrl } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  stock: z.coerce.number().min(0, "Stock cannot be negative"),
  category: z.string().min(1, "Category is required"),
  sku: z.string().min(1, "SKU is required"),
  image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

type ViewMode = "products" | "reseller" | "category";

interface ShopifyProduct {
  id: string;
  title: string;
  price: string;
  type?: string;
  body_html?: string;
  image?: {
    src: string;
  };
}

interface ShopifyProductData extends ShopifyProduct {
  [key: string]: unknown;
  image?: { src?: string };
  image_url?: string;
  featured_image?: string;
  thumbnail?: string;
  images?: Array<{ src?: string; url?: string }>;
  media?: Array<{ url?: string }>;
  body_html?: string;
  description?: string;
  category?: string;
  product_type?: string;
  name?: string;
  amount?: number | string;
  price_min?: number | string;
  variants?: Array<{ price?: number | string | { amount?: number | string; value?: number | string } }>;
  priceRange?: { min?: { amount?: number | string } };
}

export default function AdminInventoryPage() {
  const { data: dbProducts, isLoading } = useDbProducts();
  const resellers = useUnifiedResellers();
  const { canSeeAll, allowedReferralIds, allowedStaffIds, allowedStaffDocIds, allowedAdminIds } = useAdminAccess();
  const queryClient = useQueryClient();
  const { isSyncing, lastSync, syncNow, nextSync, syncUrl, setSyncUrl } = useProductSync();
  
  const { addProduct, updateProduct, deleteProduct, clearInventory, pruneNonShopifyProducts, bulkSyncProducts } = useProductMutations();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("products");
  const [scrapeUrl, setScrapeUrl] = useState("https://docs.google.com/spreadsheets/d/e/2PACX-1vRFwUqdaII1nKZgW-vXf1tExG1HPOQqsn67qIpZ4WClWUbyO_lMB0TjGJuMRvEeNMkJp4MfIuX-AmgP/pubhtml?widget=true&headers=false");
  const [scrapeCategory, setScrapeCategory] = useState("Inventory");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [shopifyOpen, setShopifyOpen] = useState(false);
  const [shopifyQuery, setShopifyQuery] = useState("");
  const [shopifyResults, setShopifyResults] = useState<ShopifyProduct[]>([]);
  const [isSearchingShopify, setIsSearchingShopify] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryRow | null>(null);
  const [tempUrl, setTempUrl] = useState(syncUrl);
  const [isLoadingDummyData, setIsLoadingDummyData] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [pruneDialogOpen, setPruneDialogOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    lastPeriodicSync?: string;
    lastSyncedCount?: number;
    lastCategory?: string;
    status?: string;
    lastError?: string;
  } | null>(null);

  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system_settings", "shopify_sync"), (doc) => {
      if (doc.exists()) {
        setSyncStatus(doc.data() as {
          lastPeriodicSync?: string;
          lastSyncedCount?: number;
          lastCategory?: string;
          status?: string;
          lastError?: string;
        });
      }
    });
    return () => unsub();
  }, []);

  const handleLoadDummyData = async () => {
    setIsLoadingDummyData(true);
    try {
      toast({
        title: "Starting Import",
        description: "Fetching 100 products from open source APIs...",
      });
      
      // Fetch from DummyJSON (limit=100)
      const res = await fetch('https://dummyjson.com/products?limit=100');
      const data = await res.json();
      
      const productsToSync = data.products.map((item: { title: string; price: number; stock?: number; category?: string; id: number; thumbnail?: string; description?: string; sku?: string }) => ({
        name: item.title,
        price: item.price,
        stock: item.stock || 50,
        category: item.category,
        sku: item.sku || `DUMMY-${item.id}`,
        image: item.thumbnail,
        description: item.description,
      }));
      
      await bulkSyncProducts.mutateAsync(productsToSync);
      
      toast({
        title: "Import Success",
        description: `Successfully synchronized ${productsToSync.length} products to your inventory.`,
      });
    } catch (error) {
      console.error("Error loading dummy data:", error);
      toast({
        title: "Error",
        description: "Failed to load dummy products.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDummyData(false);
    }
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      price: 0,
      stock: 0,
      category: "",
      sku: "",
      image: "",
      description: "",
    },
  });

  const onSubmit = async (values: ProductFormValues) => {
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          ...values,
        });
      } else {
        await addProduct.mutateAsync(values);
      }
      setProductDialogOpen(false);
      form.reset();
      setEditingProduct(null);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleClearInventory = async () => {
    try {
      await clearInventory.mutateAsync();
      setClearDialogOpen(false);
    } catch (error) {
      console.error("Error clearing inventory:", error);
    }
  };

  const handlePruneInventory = async () => {
    try {
      await pruneNonShopifyProducts.mutateAsync();
      setPruneDialogOpen(false);
    } catch (error) {
      console.error("Error pruning inventory:", error);
    }
  };

  const handleEdit = (product: InventoryRow) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      price: product.price,
      stock: product.stock,
      category: product.category,
      sku: product.sku,
      image: product.image,
      description: product.description || "",
    });
    setProductDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setProductToDelete(id);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct.mutateAsync(productToDelete);
      setProductToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "You don't have permission to delete this product.",
        variant: "destructive",
      });
      setProductToDelete(null);
    }
  };

  const handleSyncNow = async () => {
    try {
      toast({ title: "Sync Started", description: "Triggering Shopify background sync..." });
      const res = await fetch("/api/shopify/sync-now", { method: "POST" });
      if (!res.ok) throw new Error("Failed to trigger sync");
      toast({ title: "Sync Triggered", description: "The background sync process has been started." });
    } catch (error) {
      console.error("Sync error:", error);
      toast({ title: "Sync Failed", description: "Could not trigger background sync.", variant: "destructive" });
    }
  };

  const handleSaveSettings = () => {
    setSyncUrl(tempUrl);
    setSettingsOpen(false);
    toast({
      title: "Settings Saved",
      description: "Your inventory sync configuration has been updated.",
    });
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as Record<string, unknown>[];
        const productsToSync: ProductFormValues[] = [];

        if (data.length === 0) {
          toast({
            title: "Empty File",
            description: "No products found in the CSV file.",
            variant: "destructive",
          });
          return;
        }

        if (isReplacing) {
          toast({
            title: "Replacing Inventory",
            description: "Clearing existing products before upload...",
          });
          await clearInventory.mutateAsync();
        }

        toast({
          title: isReplacing ? "Uploading New Inventory" : "Processing CSV",
          description: `Found ${data.length} products. Bulk syncing now...`,
        });

        for (const row of data) {
          // Map CSV headers to our schema (case-insensitive and flexible)
          const getVal = (keys: string[]) => {
            const foundKey = Object.keys(row).find(k => 
              keys.some(searchKey => k.trim().toLowerCase() === searchKey.toLowerCase())
            );
            return foundKey ? String(row[foundKey]).trim() : undefined;
          };

          const cleanNumber = (val: string | undefined) => {
            if (!val) return "0";
            return val.replace(/[^0-9.]/g, "");
          };

          const rawPrice = getVal(["price", "cost", "unit price", "unit_price", "amount"]);
          const rawStock = getVal(["stock", "quantity", "inventory", "count", "qty"]);
          
          const productData = {
            name: getVal(["name", "product name", "title", "product_name"]) || "Unnamed Product",
            price: Math.max(0.01, parseFloat(cleanNumber(rawPrice)) || 0.01),
            stock: Math.max(0, parseInt(cleanNumber(rawStock), 10) || 0),
            category: getVal(["category", "type", "group", "category_name"]) || "Uncategorized",
            sku: getVal(["sku", "product code", "id", "product_id", "code"]) || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            image: getVal(["image url", "image", "thumbnail", "photo", "image_url"]) || "",
            description: getVal(["description", "details", "info", "desc"]) || "",
          };

          productsToSync.push(productData);
        }

        await bulkSyncProducts.mutateAsync(productsToSync);
        
        // Reset input
        e.target.value = "";
      },
      error: (error) => {
        console.error("CSV Parsing Error:", error);
        toast({
          title: "Import Failed",
          description: "Could not parse the CSV file.",
          variant: "destructive",
        });
      }
    });
  };

  const handleScrapeProducts = async () => {
    setIsScraping(true);
    try {
      // 1. Scrape products from the URL
      const scrapeResponse = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl, category: scrapeCategory }),
      });

      if (!scrapeResponse.ok) {
        const text = await scrapeResponse.text();
        let errorMessage = "Failed to scrape products from URL";
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = text.slice(0, 100) || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const text = await scrapeResponse.text();
      const contentType = scrapeResponse.headers.get("content-type");
      let products;
      
      if (contentType && contentType.includes("application/json")) {
        try {
          const data = JSON.parse(text);
          products = data.products;
        } catch (e) {
          console.error("Failed to parse JSON from /api/scrape:", text);
          throw new Error("Server returned invalid JSON data.");
        }
      } else {
        console.error("Non-JSON response from /api/scrape:", text);
        throw new Error("Server returned an invalid response format (HTML instead of JSON).");
      }

      if (!products || products.length === 0) {
        throw new Error("No products found at the provided URL.");
      }

      // 2. Sync products to Firestore using client-side mutation
      await bulkSyncProducts.mutateAsync(products);

      setScrapeOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to scrape products";
      toast({ title: "Import Failed", description: message, variant: "destructive" });
    } finally {
      setIsScraping(false);
    }
  };

  const handleShopifySearch = async () => {
    if (!shopifyQuery.trim()) return;
    setIsSearchingShopify(true);
    console.log("Searching Shopify for:", shopifyQuery);
    try {
      const res = await fetch(`/api/shopify/search?query=${encodeURIComponent(shopifyQuery)}`);
      console.log("Shopify search response status:", res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Shopify search error data:", errorData);
        throw new Error(errorData.error || "Shopify search failed");
      }
      const data = await res.json();
      console.log("Shopify search results:", data);
      setShopifyResults(data.products || []);
    } catch (error) {
      console.error("Shopify search error:", error);
      toast({ 
        title: "Search Failed", 
        description: error instanceof Error ? error.message : "Could not fetch products from Shopify.", 
        variant: "destructive" 
      });
    } finally {
      setIsSearchingShopify(false);
    }
  };

  const renderPrice = (product: ShopifyProductData) => {
    const priceVal = product.price || product.amount || product.price_min || product.variants?.[0]?.price || product.priceRange?.min?.amount || "0.00";
    if (typeof priceVal === 'object' && priceVal !== null) {
      const amount = priceVal.amount || priceVal.value || "0.00";
      return typeof amount === 'number' ? (amount / 100).toFixed(2) : String(amount);
    }
    return typeof priceVal === 'number' ? (priceVal / 100).toFixed(2) : String(priceVal);
  };

  const handleSyncShopifyProduct = async (product: ShopifyProduct) => {
    const p = product as ShopifyProductData;
    console.log("Syncing Shopify product:", p);
    try {
      const priceStr = renderPrice(p);
      let productCategory = (p.type || p.category || "Uncategorized") as string;
      productCategory = productCategory.replace(/shopify/gi, "").trim();
      if (!productCategory) productCategory = "Uncategorized";

      await addProduct.mutateAsync({
        name: ((p.title as string) || (p.name as string) || "Untitled Product").replace(/shopify/gi, "").trim(),
        price: parseFloat(priceStr) || 0,
        stock: 100, // Default stock
        category: productCategory,
        sku: `SYNC-${p.id}`,
        image: p.image?.src || p.image_url || p.featured_image || p.thumbnail || p.images?.[0]?.src || p.images?.[0]?.url || p.media?.[0]?.url || "",
        description: (p.body_html as string) || (p.description as string) || "",
        shopify_id: String(p.id),
        sync_category: productCategory,
      });
      toast({ title: "Product Synced", description: `${p.title || p.name} added to inventory.` });
    } catch (error) {
      console.error("Sync error:", error);
      toast({ title: "Sync Failed", description: "Could not add product to inventory.", variant: "destructive" });
    }
  };

  const filteredResellers = useMemo(() => {
    if (canSeeAll) return resellers;
    return resellers.filter((r) => 
      (r.referralId && allowedReferralIds.includes(r.referralId)) ||
      (r.referredBy && (allowedStaffIds.includes(r.referredBy) || allowedStaffDocIds.includes(r.referredBy))) ||
      (r.memberOfAdminId && allowedAdminIds.includes(r.memberOfAdminId))
    );
  }, [resellers, canSeeAll, allowedReferralIds, allowedStaffIds, allowedStaffDocIds, allowedAdminIds]);

  const inventory: InventoryRow[] = useMemo(() => {
    if (!dbProducts) return [];
    return dbProducts.map((p) => {
      const resellerCount = filteredResellers.filter((r) =>
        r.selectedProductIds.includes(p.id)
      ).length;
      return dbProductToInventory(p, resellerCount);
    });
  }, [dbProducts, filteredResellers]);

  const filtered = inventory.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inStock = inventory.filter(p => p.status === "In Stock").length;
  const lowStock = inventory.filter(p => p.status === "Low Stock").length;

  const categoryData = useMemo(() => {
    const map: Record<string, { count: number; totalStock: number; inStock: number; lowStock: number; outOfStock: number; totalPrice: number }> = {};
    filtered.forEach((p) => {
      const cat = p.category || "Uncategorized";
      if (!map[cat]) map[cat] = { count: 0, totalStock: 0, inStock: 0, lowStock: 0, outOfStock: 0, totalPrice: 0 };
      map[cat].count++;
      map[cat].totalStock += p.stock;
      map[cat].totalPrice += p.price;
      if (p.status === "In Stock") map[cat].inStock++;
      else if (p.status === "Low Stock") map[cat].lowStock++;
      else map[cat].outOfStock++;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d, avgPrice: d.totalPrice / d.count }));
  }, [filtered]);

  const resellerData = useMemo(() => {
    let list = filteredResellers;
    if (viewMode === "reseller" && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => 
        r.firstName.toLowerCase().includes(q) || 
        r.lastName.toLowerCase().includes(q) || 
        r.shopName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.resellerId?.toString().includes(q)
      );
    }
    return list.map((r) => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`,
      shopName: r.shopName,
      referralId: r.referralId,
      level: r.level,
      productCount: Math.max(1, Math.round(filtered.length / Math.max(filteredResellers.length, 1))),
      totalStock: filtered.reduce((s, p) => s + p.stock, 0) / Math.max(filteredResellers.length, 1),
    }));
  }, [filteredResellers, filtered, viewMode, searchQuery]);

  const statCards = [
    { label: "Total Items", value: inventory.length, icon: Package, iconBg: "bg-primary/10 text-primary" },
    { label: "Low Stock", value: lowStock, icon: AlertTriangle, iconBg: "bg-warning/10 text-warning" },
    { label: "In Stock", value: inStock, icon: CheckCircle, iconBg: "bg-success/10 text-success" },
  ];

  const viewButtons: { mode: ViewMode; label: string; icon: typeof Package }[] = [
    { mode: "products", label: "By Products", icon: ShoppingBag },
    { mode: "reseller", label: "By Reseller", icon: Users },
    { mode: "category", label: "By Category", icon: FolderOpen },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-col items-start">
              <h1 className="text-xl font-bold text-foreground">Inventory</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  User: {auth.currentUser?.email || 'Not Logged In'}
                </span>
                {auth.currentUser?.email?.toLowerCase() === 'heathercarpe34@gmail.com' && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                    Owner Access
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Loading products from database…" : `Manage your product catalog (${inventory.length} products). Linked to your Google Sheet.`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 h-8 border-green-500/30 text-green-600 hover:bg-green-50" onClick={handleScrapeProducts} disabled={isScraping}>
              {isScraping ? <LoadingSpinner size={14} /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sync from Google Sheet
            </Button>
            
            <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={handleLoadDummyData} disabled={isLoadingDummyData}>
              {isLoadingDummyData ? <LoadingSpinner size={14} /> : <Download className="h-3.5 w-3.5" />}
              Load Dummy Data
            </Button>
            
            <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this product? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={confirmDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteProduct.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="gap-1.5 h-8 font-medium" disabled={clearInventory.isPending}>
                  {clearInventory.isPending ? <LoadingSpinner size={14} /> : <Trash2 className="h-3.5 w-3.5" />}
                  Clear Inventory
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete all products from your inventory. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearInventory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Clear All Products
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={pruneDialogOpen} onOpenChange={setPruneDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 h-8 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium" disabled={pruneNonShopifyProducts.isPending}>
                  {pruneNonShopifyProducts.isPending ? <LoadingSpinner size={14} /> : <Trash2 className="h-3.5 w-3.5" />}
                  Prune Non-Shopify
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Prune non-Shopify Products?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all products from your inventory EXCEPT those synced directly from Shopify (identified by shopify ID or SHP SKU). This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePruneInventory} className="bg-amber-500 text-white hover:bg-amber-600">
                    Yes, Prune Inventory
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Dialog open={productDialogOpen} onOpenChange={(open) => {
              setProductDialogOpen(open);
              if (!open) {
                setEditingProduct(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 h-8">
                  <Plus className="h-3.5 w-3.5" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                <DialogHeader>
                  <DialogDescription>
                    Fill in the details below to {editingProduct ? "update" : "create"} a product in your native database.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="name">Product Name</Label>
                      <Input id="name" {...form.register("name")} placeholder="e.g. Premium Wireless Headphones" />
                      {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input id="sku" {...form.register("sku")} placeholder="e.g. WH-1000XM4" />
                      {form.formState.errors.sku && <p className="text-xs text-destructive">{form.formState.errors.sku.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input id="category" {...form.register("category")} placeholder="e.g. Electronics" />
                      {form.formState.errors.category && <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input id="price" type="number" step="0.01" {...form.register("price")} />
                      {form.formState.errors.price && <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stock">Initial Stock</Label>
                      <Input id="stock" type="number" {...form.register("stock")} />
                      {form.formState.errors.stock && <p className="text-xs text-destructive">{form.formState.errors.stock.message}</p>}
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="image">Image URL</Label>
                      <Input id="image" {...form.register("image")} placeholder="https://example.com/image.jpg" />
                      {form.formState.errors.image && <p className="text-xs text-destructive">{form.formState.errors.image.message}</p>}
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" {...form.register("description")} placeholder="Describe the product..." className="min-h-[100px]" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setProductDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={addProduct.isPending || updateProduct.isPending}>
                      {addProduct.isPending || updateProduct.isPending ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2">
              {lastSync && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last Sync: {format(lastSync, "HH:mm:ss")}
                </span>
              )}
              <Button 
                size="sm" 
                variant="default" 
                className="gap-1.5 h-8"
                onClick={handleSyncNow}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync from Data API"}
              </Button>

              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Inventory Sync Settings</DialogTitle>
                  <DialogHeader>
                    <DialogDescription>
                      Configure where your inventory data comes from. You can use a custom API or a Google Sheet.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="sync-url">Data Source URL</Label>
                      <Input 
                        id="sync-url" 
                        placeholder="https://api.example.com/products or Google Sheet CSV URL" 
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Tip: For Google Sheets, use the "Publish to Web" option and choose "CSV" format.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Sync Frequency</Label>
                      <Select defaultValue="5">
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Every 1 minute</SelectItem>
                          <SelectItem value="5">Every 5 minutes</SelectItem>
                          <SelectItem value="15">Every 15 minutes</SelectItem>
                          <SelectItem value="60">Every 1 hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveSettings}>Save Configuration</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {nextSync && (
              <span className="text-[10px] text-muted-foreground/60 italic">
                Next scheduled sync: {format(nextSync, "HH:mm")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} iconBg={s.iconBg} />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 w-full sm:w-72">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search products..." className="bg-transparent border-none outline-none text-sm w-full" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {viewButtons.map((vb) => (
            <Button
              key={vb.mode}
              variant={viewMode === vb.mode ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode(vb.mode)}
              className="gap-1.5"
            >
              <vb.icon className="h-3.5 w-3.5" />
              {vb.label}
            </Button>
          ))}

          <Sheet open={scrapeOpen} onOpenChange={setScrapeOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                <Globe className="h-3.5 w-3.5" />
                Import / Sync Web
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Web Import & Sync
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      Google Sheets Sync (Recommended)
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      1. In Google Sheets, go to <strong>File &gt; Share &gt; Publish to web</strong>.<br />
                      2. Select <strong>Entire Document</strong> and <strong>Comma-separated values (.csv)</strong>.<br />
                      3. Copy the generated link and paste it below.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Source URL (CSV or Web Page)</label>
                    <Input
                      value={scrapeUrl}
                      onChange={(e) => setScrapeUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Default Category</label>
                    <Input
                      value={scrapeCategory}
                      onChange={(e) => setScrapeCategory(e.target.value)}
                      placeholder="e.g. Electronics"
                    />
                  </div>

                  <Button
                    onClick={handleScrapeProducts}
                    disabled={isScraping || !scrapeUrl.trim()}
                    className="w-full gap-2"
                  >
                    {isScraping ? (
                      <>
                        <LoadingSpinner size={16} />
                        Processing & Syncing…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Sync Products Now
                      </>
                    )}
                  </Button>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold mb-3">Other Web Sources</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    You can also paste URLs from Amazon, eBay, or other e-commerce sites to scrape products directly.
                  </p>
                  <div className="rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground space-y-1">
                    <p><strong>Note:</strong> Web scraping depends on the site's structure and may not always capture all details. CSV sync is more reliable for bulk management.</p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={shopifyOpen} onOpenChange={setShopifyOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 border-green-500/30 text-green-600 hover:bg-green-50">
                <ShoppingCart className="h-3.5 w-3.5" />
                Shopify Sync
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  1-CartForU Global Catalog Sync
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {syncStatus && (
                  <div className={`p-4 rounded-lg border ${syncStatus.status === 'error' ? 'bg-destructive/5 border-destructive/20' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Periodic Sync Status
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${syncStatus.status === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-700'}`}>
                        {syncStatus.status || 'Idle'}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Last Sync: {syncStatus.lastPeriodicSync ? new Date(syncStatus.lastPeriodicSync).toLocaleString() : 'Never'}</p>
                      {syncStatus.lastCategory && (
                        <p>Category: <span className="font-medium text-foreground">{syncStatus.lastCategory}</span></p>
                      )}
                      {syncStatus.lastSyncedCount !== undefined && (
                        <p>Products Added: {syncStatus.lastSyncedCount}</p>
                      )}
                      {syncStatus.lastError && (
                        <p className="text-destructive mt-2 font-medium">Error: {syncStatus.lastError}</p>
                      )}
                      <div className="mt-3">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full h-7 text-[10px]" 
                          onClick={handleSyncNow}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Sync Now
                        </Button>
                      </div>
                      <p className="mt-2 text-[10px] italic">Syncs automatically every 5 minutes</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input 
                    placeholder="Search Shopify global catalog..." 
                    value={shopifyQuery}
                    onChange={(e) => setShopifyQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleShopifySearch()}
                  />
                  <Button onClick={handleShopifySearch} disabled={isSearchingShopify}>
                    {isSearchingShopify ? <LoadingSpinner size={16} /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="space-y-4">
                  {shopifyResults.length > 0 ? (
                    shopifyResults.map((product) => {
                      const p = product as ShopifyProductData;
                      return (
                      <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50">
                        <div className="flex items-center gap-3">
                          <img 
                            src={p.image?.src || p.image_url || p.featured_image || p.thumbnail || p.images?.[0]?.src || p.images?.[0]?.url || p.media?.[0]?.url || "/placeholder.svg"} 
                            alt={(p.title as string) || (p.name as string)} 
                            className="h-12 w-12 rounded object-cover border"
                          />
                          <div>
                            <p className="text-sm font-medium line-clamp-1">{(p.title as string) || (p.name as string)}</p>
                            <p className="text-xs text-muted-foreground">
                              ${renderPrice(p)} • {(p.type as string) || (p.category as string) || (p.product_type as string) || "No Category"}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleSyncShopifyProduct(product)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )})
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Search for products to sync from Shopify</p>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="relative flex items-center gap-2">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="csv-upload"
              onChange={handleCsvUpload}
            />
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1.5"
              onClick={() => {
                setIsReplacing(false);
                document.getElementById("csv-upload")?.click();
              }}
            >
              <Upload className="h-3.5 w-3.5" />
              Bulk Upload CSV
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Replace All Inventory
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Replace Entire Inventory?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all existing products and replace them with the ones in your CSV file. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => {
                      setIsReplacing(true);
                      document.getElementById("csv-upload")?.click();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Confirm & Select File
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const headers = "SKU,Name,Description,Price,Stock,Category,Image URL\n";
                const example = "WH-001,Wireless Headphones,High-quality noise-canceling headphones.,99.99,50,Electronics,https://picsum.photos/seed/headphones/200\n";
                const blob = new Blob([headers + example], { type: "text/csv" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "inventory_template.csv";
                a.click();
              }}
            >
              <FileText className="h-3.5 w-3.5" />
              Download Template
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-card border border-border shadow-theme-sm overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === "products" && <ProductsTable data={filtered} onEdit={handleEdit} onDelete={handleDelete} />}
          {viewMode === "reseller" && <ResellerTable data={resellerData} />}
          {viewMode === "category" && <CategoryTable data={categoryData} />}
        </div>
      </div>
    </div>
  );
}

function ProductsTable({ data, onEdit, onDelete }: { data: InventoryRow[], onEdit: (p: InventoryRow) => void, onDelete: (id: string) => void }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b bg-muted/50">
          {["", "SKU", "Product", "Category", "Price", "Stock", "Resellers", "Status", ""].map((h, i) => (
            <th key={`${h}-${i}`} className="thead-label text-left p-3.5 first:pl-5">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {data.slice(0, 50).map((p) => (
          <tr key={p.id} className="hover:bg-accent/50 transition-colors">
            <td className="p-3.5 pl-5">
              {p.image ? (
                <img 
                  src={parseImageUrl(p.image) || "/placeholder.svg"} 
                  alt={p.name} 
                  className="h-10 w-10 rounded-lg object-cover border border-border" 
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </td>
            <td className="p-3.5"><span className="mono-badge">{p.sku}</span></td>
            <td className="p-3.5 text-sm font-medium text-foreground max-w-[200px] truncate">{p.name}</td>
            <td className="p-3.5 text-sm text-muted-foreground capitalize">{p.category}</td>
            <td className="p-3.5 text-sm font-semibold text-foreground">${p.price.toFixed(2)}</td>
            <td className="p-3.5 text-sm text-foreground">{p.stock}</td>
            <td className="p-3.5 text-sm text-muted-foreground">{p.resellerCount}</td>
            <td className="p-3.5"><StockBadge status={p.status} /></td>
            <td className="p-3.5 pr-5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded-md hover:bg-accent transition-colors">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(p)} className="gap-2">
                    <Edit className="h-4 w-4" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(p.id)} className="gap-2 text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" /> Delete Product
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const vipColors: Record<number, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  2: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  3: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  4: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  5: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

function ResellerTable({ data }: { data: { id: string; name: string; shopName: string; referralId: string; level: string | number; productCount: number; totalStock: number }[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b bg-muted/50">
          {["Reseller", "Shop Name", "Referral ID", "Products", "Total Stock", "VIP Level"].map((h) => (
            <th key={h} className="thead-label text-left p-3.5 first:pl-5">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {data.map((r) => (
          <tr key={r.id} className="hover:bg-accent/50 transition-colors">
            <td className="p-3.5 pl-5 text-sm font-medium text-foreground">{r.name}</td>
            <td className="p-3.5 text-sm text-muted-foreground">{r.shopName}</td>
            <td className="p-3.5"><span className="mono-badge">{r.referralId}</span></td>
            <td className="p-3.5 text-sm text-foreground">{r.productCount}</td>
            <td className="p-3.5 text-sm text-foreground">{Math.round(r.totalStock)}</td>
            <td className="p-3.5">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${vipColors[r.level] || vipColors[0]}`}>
                VIP-{r.level}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CategoryTable({ data }: { data: { name: string; count: number; totalStock: number; inStock: number; lowStock: number; outOfStock: number; avgPrice: number }[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b bg-muted/50">
          {["Category", "Products", "Total Stock", "In Stock", "Low Stock", "Out of Stock", "Avg Price"].map((h) => (
            <th key={h} className="thead-label text-left p-3.5 first:pl-5">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {data.map((c) => (
          <tr key={c.name} className="hover:bg-accent/50 transition-colors">
            <td className="p-3.5 pl-5 text-sm font-medium text-foreground capitalize">{c.name}</td>
            <td className="p-3.5 text-sm text-foreground">{c.count}</td>
            <td className="p-3.5 text-sm text-foreground">{c.totalStock}</td>
            <td className="p-3.5"><StatusBadge label={String(c.inStock)} variant="success" /></td>
            <td className="p-3.5"><StatusBadge label={String(c.lowStock)} variant="warning" /></td>
            <td className="p-3.5"><StatusBadge label={String(c.outOfStock)} variant="danger" /></td>
            <td className="p-3.5 text-sm font-semibold text-foreground">${c.avgPrice.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StockBadge({ status }: { status: string }) {
  const variantMap: Record<string, "success" | "warning" | "danger"> = {
    "In Stock": "success", "Low Stock": "warning", "Out of Stock": "danger",
  };
  return <StatusBadge label={status} variant={variantMap[status] || "default"} />;
}
