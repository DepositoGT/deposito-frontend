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
import { fetchStatuses } from "@/services/statusService";

export const STATUSES_QUERY_KEY = ["statuses"] as const;

export const useStatuses = () => {
  return useQuery({
    queryKey: STATUSES_QUERY_KEY,
    queryFn: fetchStatuses,
    staleTime: 5 * 60 * 1000,
  });
};
