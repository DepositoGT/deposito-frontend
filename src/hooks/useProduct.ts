/**
 * Hook para obtener un producto por id.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchProductById } from "@/services/productService";

export const useProduct = (id?: string) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => (id ? fetchProductById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
};

