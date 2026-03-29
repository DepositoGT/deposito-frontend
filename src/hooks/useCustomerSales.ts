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
import { fetchSalesByCustomerContact, type SalesListResponse } from "@/services/saleService";

export function useCustomerSales(
  customerContactId: string | undefined,
  opts: { page: number; pageSize: number; enabled: boolean }
) {
  return useQuery<SalesListResponse>({
    queryKey: ["customerSales", customerContactId, opts.page, opts.pageSize],
    queryFn: () =>
      fetchSalesByCustomerContact(customerContactId!, {
        page: opts.page,
        pageSize: opts.pageSize,
      }),
    enabled: Boolean(customerContactId) && opts.enabled,
  });
}
