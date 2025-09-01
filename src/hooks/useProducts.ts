// filepath: /home/DiegoPatzan/Documents/CODE/deposito/guate-liquor-vault-13/src/hooks/useProducts.ts
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/services/productService";

export const PRODUCTS_QUERY_KEY = ["products"] as const;

export const useProducts = () => {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: fetchProducts,
    staleTime: 60 * 1000, // 1 min
  });
};
