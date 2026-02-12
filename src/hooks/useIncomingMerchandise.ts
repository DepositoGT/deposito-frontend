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
import {
  fetchIncomingMerchandise,
  getIncomingMerchandiseById,
  type IncomingMerchandiseQueryParams,
} from '@/services/incomingMerchandiseService'

export const useIncomingMerchandise = (params?: IncomingMerchandiseQueryParams) => {
  return useQuery({
    queryKey: ['incoming-merchandise', params],
    queryFn: () => fetchIncomingMerchandise(params),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export const useIncomingMerchandiseById = (id?: string) => {
  return useQuery({
    queryKey: ['incoming-merchandise', id],
    queryFn: () => getIncomingMerchandiseById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}
