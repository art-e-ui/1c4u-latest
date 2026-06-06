import { Product } from "@/lib/types";

export async function fetchExternalProducts(url?: string): Promise<Product[]> {
  const targetUrl = url || "https://api.escuelajs.co/api/v1/products";
  
  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${targetUrl}: ${response.statusText}`);
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : (data.products || []);
    
    interface ExternalProduct {
      id: string | number;
      title?: string;
      name?: string;
      price?: number | string;
      thumbnail?: string;
      images?: string[];
      image?: string;
      category?: string | { name: string };
      sku?: string;
      stock?: number;
      description?: string;
    }

    return items.map((item: ExternalProduct) => ({
      id: `ext-${item.id}`,
      name: item.title || item.name || "Unknown Product",
      price: Number(item.price) || 0,
      image: item.thumbnail || (item.images && item.images[0]) || item.image || "",
      category: item.category?.name || item.category || "Uncategorized",
      sku: item.sku || `SKU-${item.id}`,
      stock: item.stock ?? 10, // Default to 10 if stock is not provided
      description: item.description || "",
    }));
  } catch (error) {
    console.error("Error fetching external products:", error);
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(`Failed to fetch from ${targetUrl}. This might be due to CORS restrictions, an invalid URL, or network issues. Please check your Data Source URL in settings.`);
    }
    throw error;
  }
}
