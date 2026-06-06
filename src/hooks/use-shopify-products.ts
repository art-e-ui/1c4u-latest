import { useQuery } from '@tanstack/react-query';
import { storefrontApiRequest } from '@/lib/shopify/config';
import { STOREFRONT_PRODUCTS_QUERY, STOREFRONT_PRODUCT_BY_HANDLE_QUERY } from '@/lib/shopify/queries';
import type { ShopifyProduct } from '@/lib/shopify/types';

export function useShopifyProducts(first = 50, searchQuery?: string) {
  return useQuery({
    queryKey: ['shopify-products', first, searchQuery],
    queryFn: async (): Promise<ShopifyProduct[]> => {
      const data = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, {
        first,
        query: searchQuery || null,
      });
      return data?.data?.products?.edges || [];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useShopifyProductByHandle(handle: string | undefined) {
  return useQuery({
    queryKey: ['shopify-product', handle],
    queryFn: async () => {
      if (!handle) return null;
      const data = await storefrontApiRequest(STOREFRONT_PRODUCT_BY_HANDLE_QUERY, { handle });
      return data?.data?.productByHandle || null;
    },
    enabled: !!handle,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
