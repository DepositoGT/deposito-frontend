/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

// filepath: /home/DiegoPatzan/Documents/CODE/deposito/guate-liquor-vault-13/src/hooks/useSuppliers.ts
import { useQuery } from "@tanstack/react-query";
import { fetchSuppliers, fetchAllSuppliers, type SuppliersQueryParams, type SuppliersResponse } from "@/services/supplierService";

export const SUPPLIERS_QUERY_KEY = ["suppliers"] as const;

export const useSuppliers = (params?: SuppliersQueryParams) => {
  return useQuery<SuppliersResponse>({
    queryKey: [...SUPPLIERS_QUERY_KEY, params],
    queryFn: () => fetchSuppliers(params),
    staleTime: 60 * 1000,
  });
};

// Hook para obtener todos los proveedores (sin paginación)
export const useAllSuppliers = () => {
  return useQuery({
    queryKey: [...SUPPLIERS_QUERY_KEY, "all"],
    queryFn: fetchAllSuppliers,
    staleTime: 60 * 1000,
  });
};
