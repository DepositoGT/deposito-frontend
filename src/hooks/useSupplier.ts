/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useQuery } from "@tanstack/react-query";
import { fetchSupplierById } from "@/services/supplierService";

export const useSupplier = (id?: string) => {
  return useQuery({
    queryKey: ["supplier", id],
    queryFn: () => (id ? fetchSupplierById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
};
