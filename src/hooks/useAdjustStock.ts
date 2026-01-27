/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adjustProductStock } from "@/services/productService";
import { PRODUCTS_QUERY_KEY } from "@/hooks/useProducts";

export const useAdjustStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; payload: Parameters<typeof adjustProductStock>[1] }) =>
      adjustProductStock(params.id, params.payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
  });
};

export default useAdjustStock;
