/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useQuery } from '@tanstack/react-query'
import { getAnalytics, AnalyticsResponse } from '@/services/analyticsService'

// Hook para obtener analítica por año específico o 'all' (desde 2025 hasta año actual)
export function useAnalytics(year: number | 'all') {
  return useQuery<AnalyticsResponse>({
    queryKey: ['analytics', year],
    queryFn: () => getAnalytics(year),
    staleTime: 5 * 60 * 1000,
  })
}
