import { useQuery } from "@tanstack/react-query";
import { fetchSupplierById } from "@/services/supplierService";

export const useSupplier = (id?: string) => {
  return useQuery({
    queryKey: ["supplier", id],
    queryFn: () => (id ? fetchSupplierById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
};
