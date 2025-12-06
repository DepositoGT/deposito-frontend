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
