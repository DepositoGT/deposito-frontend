import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct } from "@/services/productService";
import { PRODUCTS_QUERY_KEY } from "@/hooks/useProducts";

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; payload: Parameters<typeof updateProduct>[1] }) => updateProduct(params.id, params.payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
  });
};

export default useUpdateProduct;
