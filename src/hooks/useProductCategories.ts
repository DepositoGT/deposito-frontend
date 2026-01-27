/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../services/api'

export interface ProductCategory {
  id: number
  name: string
  deleted: boolean
  _count?: {
    products: number
    suppliers: number
  }
}

// Obtener todas las categorías
export function useProductCategories(includeDeleted = false) {
  return useQuery({
    queryKey: ['productCategories', includeDeleted],
    queryFn: async () => {
      const params = includeDeleted ? '?includeDeleted=true' : ''
      return apiFetch<ProductCategory[]>(`/catalogs/product-categories${params}`)
    },
  })
}

// Crear categoría
export function useCreateProductCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiFetch<ProductCategory>('/catalogs/product-categories', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productCategories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] }) // Para useCategories
    },
  })
}

// Actualizar categoría
export function useUpdateProductCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string } }) => {
      return apiFetch<ProductCategory>(`/catalogs/product-categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productCategories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

// Eliminar categoría (soft delete)
export function useDeleteProductCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch(`/catalogs/product-categories/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productCategories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

// Restaurar categoría
export function useRestoreProductCategory() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch(`/catalogs/product-categories/${id}/restore`, { method: 'PATCH' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productCategories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
