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
import { deleteProduct, removeProductFromBranch } from "@/services/productService";
import { useProducts, PRODUCTS_QUERY_KEY } from "@/hooks/useProducts";

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
  });
};

/** Lo quita solo de la sucursal activa; el producto sigue en las demás. */
export const useRemoveProductFromBranch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeProductFromBranch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
  });
};
