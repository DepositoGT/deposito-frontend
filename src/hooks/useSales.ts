/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useQuery, useQueries } from "@tanstack/react-query";
import { fetchSales, SalesQueryParams } from "@/services/salesService";

export const SALES_QUERY_KEY = ["sales"] as const;

export const useSales = (params: SalesQueryParams = {}) => {
  return useQuery({
    queryKey: [...SALES_QUERY_KEY, params] as const,
    queryFn: () => fetchSales(params),
    staleTime: 30 * 1000,
  });
};

// Hook to fetch a single status
export const useSalesByStatus = (status: string, params: Omit<SalesQueryParams, 'status'> = {}) => {
  return useSales({ ...params, status });
};

// Hook to fetch multiple statuses concurrently. Accepts an array of status names.
export const useAllSalesByStatuses = (statuses: string[], params: Omit<SalesQueryParams, 'status'> = {}) => {
  const queries = statuses.map((s) => ({
    queryKey: [...SALES_QUERY_KEY, { ...params, status: s }],
    queryFn: () => fetchSales({ ...params, status: s }),
    staleTime: 30 * 1000,
  }));

  return useQueries({ queries });
};

export default useSales;
