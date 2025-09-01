import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSupplier } from "@/services/supplierService";
import { SUPPLIERS_QUERY_KEY } from "@/hooks/useSuppliers";

export const useDeleteSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY }),
  });
};
