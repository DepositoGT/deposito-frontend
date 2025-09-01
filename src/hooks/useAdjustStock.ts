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
