import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "@/services/productService";
import { PRODUCTS_QUERY_KEY } from "@/hooks/useProducts";

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createProduct>[0]) => createProduct(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
  });
};
