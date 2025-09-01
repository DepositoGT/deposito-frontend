// filepath: /home/DiegoPatzan/Documents/CODE/deposito/guate-liquor-vault-13/src/hooks/useSuppliers.ts
import { useQuery } from "@tanstack/react-query";
import { fetchSuppliers } from "@/services/supplierService";

export const SUPPLIERS_QUERY_KEY = ["suppliers"] as const;

export const useSuppliers = () => {
  return useQuery({
    queryKey: SUPPLIERS_QUERY_KEY,
    queryFn: fetchSuppliers,
    staleTime: 60 * 1000,
  });
};
