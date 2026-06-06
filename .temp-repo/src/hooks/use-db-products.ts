import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  writeBatch
} from "firebase/firestore";
import type { Product, Category } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

// Types for compatibility with the rest of the app
export type DbProduct = Product;
export type DbCategory = Category;

export interface DbReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  helpful_count: number;
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
  };
}

export function useDbReviews(productId: string) {
  return useQuery({
    queryKey: ["db-reviews", productId],
    queryFn: async () => {
      try {
        const reviewsQuery = query(
          collection(db, "reviews"), 
          where("product_id", "==", productId),
          orderBy("created_at", "desc")
        );
        const snapshot = await getDocs(reviewsQuery);
        
        const reviews = snapshot.docs.map((reviewDoc) => {
          const reviewData = reviewDoc.data();
          return {
            id: reviewDoc.id,
            ...reviewData,
            users: {
              first_name: reviewData.user_first_name || "Unknown",
              last_name: reviewData.user_last_name || "User"
            }
          } as DbReview;
        });
        
        return reviews;
      } catch (error) {
        console.error("Error fetching reviews from Firestore:", error);
        throw error;
      }
    },
    enabled: !!productId,
  });
}

export function useReviewMutations() {
  const queryClient = useQueryClient();

  const addReview = useMutation({
    mutationFn: async (newReview: { product_id: string; rating: number; title: string; content: string }) => {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be logged in to leave a review.");

      // Fetch user name for denormalization
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      const reviewData = {
        ...newReview,
        user_id: user.uid,
        user_first_name: userData.first_name || "Unknown",
        user_last_name: userData.last_name || "User",
        helpful_count: 0,
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "reviews"), reviewData);
      return { id: docRef.id, ...reviewData };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["db-reviews", variables.product_id] });
      toast({ title: "Review Submitted", description: "Thank you for your feedback!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  return { addReview };
}

export function useDbProducts() {
  return useQuery({
    queryKey: ["db-products"],
    queryFn: async () => {
      try {
        const productsQuery = query(
          collection(db, "products"), 
          orderBy("created_at", "desc")
        );
        const snapshot = await getDocs(productsQuery);
        
        return snapshot.docs.map(doc => dbProductToLegacy({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error fetching products from Firestore:", error);
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useDbCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const snapshot = await getDocs(query(collection(db, "categories"), limit(100)));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error fetching categories:", error);
        throw error;
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useProductMutations() {
  const queryClient = useQueryClient();

  const mapToDb = (p: Partial<Product>) => {
    const dbObj: Record<string, unknown> = { ...p };
    if (p.category !== undefined) {
      dbObj.category_slug = p.category;
      delete dbObj.category;
    }
    if (p.image !== undefined) {
      dbObj.image_url = p.image;
      delete dbObj.image;
    }
    if (p.originalPrice !== undefined) {
      dbObj.original_price = p.originalPrice;
      delete dbObj.originalPrice;
    }
    
    // Remove fields not in the database schema
    delete dbObj.inStock;
    delete dbObj.badge;
    delete dbObj.seller;
    delete dbObj.specifications;
    
    return dbObj;
  };

  const addProduct = useMutation({
    mutationFn: async (newProduct: Partial<Product>) => {
      const productData = {
        ...mapToDb(newProduct),
        created_at: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, "products"), productData);
      return { id: docRef.id, ...productData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["db-products"] });
      toast({ title: "Product Added", description: "The product has been saved to your database." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const productRef = doc(db, "products", id);
      await updateDoc(productRef, mapToDb(updates));
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["db-products"] });
      toast({ title: "Product Updated", description: "Changes have been saved." });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "products", id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["db-products"] });
      toast({ title: "Product Deleted", description: "The product has been removed." });
    },
  });

  const clearInventory = useMutation({
    mutationFn: async () => {
      console.log("Starting inventory clear...");
      const snapshot = await getDocs(collection(db, "products"));
      console.log(`Found ${snapshot.docs.length} products to delete.`);
      
      const MAX_BATCH_SIZE = 400;
      let batch = writeBatch(db);
      let operationCount = 0;

      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        operationCount++;

        if (operationCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          console.log("Committed batch.");
          batch = writeBatch(db);
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        await batch.commit();
        console.log("Committed final batch.");
      }
      console.log("Inventory cleared successfully.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["db-products"] });
      toast({ title: "Inventory Cleared", description: "All products have been removed." });
    },
    onError: (error) => {
      console.error("Error clearing inventory:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const bulkSyncProducts = useMutation({
    mutationFn: async (products: Partial<Product>[]) => {
      const results = [];
      // Get all existing products first to avoid multiple queries
      const existingProductsSnapshot = await getDocs(collection(db, "products"));
      const existingProducts = existingProductsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Partial<Product> & { id: string })[];

      // Firestore batches can handle up to 500 operations
      const MAX_BATCH_SIZE = 400;
      let batch = writeBatch(db);
      let operationCount = 0;

      for (const product of products) {
        // Check if product already exists by SKU (preferred) or name
        let existingDoc = null;
        
        if (product.sku) {
          existingDoc = existingProducts.find(p => p.sku === product.sku);
        }
        
        if (!existingDoc && product.name) {
          existingDoc = existingProducts.find(p => p.name === product.name);
        }

        if (!existingDoc) {
          const newDocRef = doc(collection(db, "products"));
          batch.set(newDocRef, {
            ...product,
            created_at: new Date().toISOString()
          });
          results.push({ name: product.name, status: "created", id: newDocRef.id });
        } else {
          // Update existing
          const existingDocRef = doc(db, "products", existingDoc.id);
          batch.update(existingDocRef, {
            ...product,
            updated_at: new Date().toISOString()
          });
          results.push({ name: product.name, status: "updated", id: existingDoc.id });
        }

        operationCount++;

        // Commit batch if it reaches the limit
        if (operationCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }

      // Commit any remaining operations
      if (operationCount > 0) {
        await batch.commit();
      }

      return { results };
    },
    onSuccess: (data: { results: { status: string }[] }) => {
      queryClient.invalidateQueries({ queryKey: ["db-products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      const created = data.results.filter((r) => r.status === "created").length;
      const updated = data.results.filter((r) => r.status === "updated").length;
      toast({ 
        title: "Bulk Sync Complete", 
        description: `Successfully processed ${data.results.length} products (${created} new, ${updated} updated).` 
      });
    },
    onError: (error) => {
      toast({ title: "Sync Error", description: error.message, variant: "destructive" });
    }
  });

  return { addProduct, updateProduct, deleteProduct, clearInventory, bulkSyncProducts };
}

function parseImageUrl(url: unknown): string {
  if (!url) return "";
  const strUrl = String(url);
  
  // Handle cases where the URL is a stringified JSON array (e.g. from escuelajs API)
  if (strUrl.startsWith('["') && strUrl.endsWith('"]')) {
    try {
      const parsed = JSON.parse(strUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Some APIs double-stringify, so we might need to parse again or just clean it
        const firstUrl = String(parsed[0]);
        if (firstUrl.startsWith('["') && firstUrl.endsWith('"]')) {
           try {
             const doubleParsed = JSON.parse(firstUrl);
             if (Array.isArray(doubleParsed) && doubleParsed.length > 0) {
               return String(doubleParsed[0]);
             }
           } catch { /* ignore */ }
        }
        return firstUrl;
      }
    } catch {
      // If parsing fails, just clean up the brackets and quotes
      return strUrl.replace(/^\["/, '').replace(/"\]$/, '').replace(/","/g, ',');
    }
  }
  
  return strUrl;
}

// Adapter: convert DB product to the legacy Product shape used across the app
export function dbProductToLegacy(p: Record<string, unknown>): Product {
  // If it's already in the legacy shape (from mock data), just return it
  if ('price' in p && typeof p.price === 'number' && !p.created_at) {
    return p as unknown as Product;
  }
  
  return {
    id: String(p.id ?? ""),
    name: String(p.name ?? p.title ?? ""),
    price: Number(p.price ?? 0),
    originalPrice: p.original_price ? Number(p.original_price) : undefined,
    image: parseImageUrl(p.image_url || p.image || ""),
    rating: Number(p.rating ?? 0),
    category: String(p.category_slug ?? p.category ?? ""),
    badge: p.badge ? String(p.badge) : undefined,
    description: p.description ? String(p.description) : undefined,
    seller: p.seller ? String(p.seller) : undefined,
    inStock: Boolean(p.in_stock ?? true),
    stock: Number(p.stock ?? 0),
    sku: String(p.sku ?? ""),
    specifications: p.specifications
      ? (p.specifications as Record<string, string>)
      : undefined,
  };
}

// Build inventory view from DB products + reseller data
export interface InventoryRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  image: string;
  resellerCount: number;
  description?: string;
}

export function dbProductToInventory(
  p: Product | Record<string, unknown>,
  resellerCount: number
): InventoryRow {
  const raw = p as Record<string, unknown>;
  const stock = Number(raw.stock ?? 50); // Default stock for mock data
  return {
    id: String(raw.id ?? ""),
    sku: raw.sku ? String(raw.sku) : `SKU-${String(raw.id ?? "").slice(0, 6).toUpperCase()}`,
    name: String(raw.name ?? ""),
    category: String(raw.category_slug || raw.category || "uncategorized"),
    price: Number(raw.price ?? 0),
    stock,
    status:
      stock === 0
        ? "Out of Stock"
        : stock < 15
          ? "Low Stock"
          : "In Stock",
    image: parseImageUrl(raw.image_url || raw.image || ""),
    resellerCount,
    description: raw.description ? String(raw.description) : undefined,
  };
}
