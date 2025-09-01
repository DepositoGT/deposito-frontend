import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSupplier, type CreateSupplierPayload } from "@/services/supplierService";
import { SUPPLIERS_QUERY_KEY } from "@/hooks/useSuppliers";

export const useCreateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) => createSupplier(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY }),
  });
};
