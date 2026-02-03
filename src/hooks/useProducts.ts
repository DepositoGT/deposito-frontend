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

// Legacy hook for backward compatibility (returns all products as array)
export const useAllProducts = () => {
  return useQuery<Product[], Error>({
    queryKey: [...PRODUCTS_QUERY_KEY, "all"],
    queryFn: async () => {
      const data = await fetchAllProducts();
      return data;
    },
    staleTime: 60 * 1000, // 1 min
  });
};

export const useDeletedProducts = () => {
  return useQuery({
    queryKey: ["products", "deleted"],
    queryFn: async () => {
      const response = await apiFetch<Product[]>("/products?includeDeleted=true");
      return response.filter((p) => p.deleted === true);
    },
    staleTime: 30 * 1000, // 30 seconds
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
