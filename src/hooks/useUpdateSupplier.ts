import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSupplier } from "@/services/supplierService";
import { SUPPLIERS_QUERY_KEY } from "@/hooks/useSuppliers";

export const useUpdateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
  mutationFn: ({ id, payload }: { id: string; payload: Partial<Record<string, unknown>> }) => updateSupplier(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY }),
  });
};
