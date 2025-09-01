import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProduct } from "@/services/productService";
import { useProducts, PRODUCTS_QUERY_KEY } from "@/hooks/useProducts";

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
  });
};
