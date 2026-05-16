/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

// filepath: /home/DiegoPatzan/Documents/CODE/deposito/guate-liquor-vault-13/src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProducts, fetchAllProducts, type ProductsQueryParams, type ProductsResponse } from "@/services/productService";
import { apiFetch } from "@/services/api";
import type { Product } from "@/types";
import { adaptApiProduct } from "@/services/productService";

export const PRODUCTS_QUERY_KEY = ["products"] as const;

export const useProducts = (params?: ProductsQueryParams) => {
  return useQuery<ProductsResponse, Error>({
    queryKey: [...PRODUCTS_QUERY_KEY, params],
    queryFn: () => fetchProducts(params),
    staleTime: 60 * 1000, // 1 min
  });
};

/** Catálogo completo en memoria (p. ej. POS). Con `forSaleOnly`, excluye productos marcados solo para inventario. */
export const useAllProducts = (options?: { forSaleOnly?: boolean }) => {
  const forSaleOnly = options?.forSaleOnly === true;
  return useQuery<Product[], Error>({
    queryKey: [...PRODUCTS_QUERY_KEY, "all", forSaleOnly],
    queryFn: async () => fetchAllProducts({ forSaleOnly }),
    staleTime: 60 * 1000, // 1 min
  });
};

export const useDeletedProducts = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled !== false;
  return useQuery<Product[], Error>({
    queryKey: ["products", "deleted"],
    queryFn: async () => {
      const response = await fetchProducts({
        page: 1,
        pageSize: 1000,
        includeDeleted: true,
      });
      const allProducts = response.items.map(adaptApiProduct);
      return allProducts.filter((p) => p.deleted === true);
    },
    staleTime: 30 * 1000,
    enabled,
  });
};

export const useRestoreProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/products/${id}/restore`, { method: "PATCH" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["products", "deleted"] });
    },
  });
};
