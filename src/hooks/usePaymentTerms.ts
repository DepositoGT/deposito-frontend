import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../services/api'

export interface PaymentTerm {
  id: number
  name: string
  deleted: boolean
  _count?: {
    suppliers: number
  }
}

export const PAYMENT_TERMS_QUERY_KEY = ["paymentTerms"] as const;

// Obtener todos los términos de pago
export function usePaymentTerms(includeDeleted = false) {
  return useQuery({
    queryKey: [...PAYMENT_TERMS_QUERY_KEY, includeDeleted],
    queryFn: async () => {
      const params = includeDeleted ? '?includeDeleted=true' : ''
      return apiFetch<PaymentTerm[]>(`/catalogs/payment-terms${params}`)
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Crear término de pago
export function useCreatePaymentTerm() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiFetch<PaymentTerm>('/catalogs/payment-terms', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_TERMS_QUERY_KEY })
    },
  })
}

// Actualizar término de pago
export function useUpdatePaymentTerm() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string } }) => {
      return apiFetch<PaymentTerm>(`/catalogs/payment-terms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_TERMS_QUERY_KEY })
    },
  })
}

// Eliminar término de pago (soft delete)
export function useDeletePaymentTerm() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch(`/catalogs/payment-terms/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_TERMS_QUERY_KEY })
    },
  })
}

// Restaurar término de pago
export function useRestorePaymentTerm() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch(`/catalogs/payment-terms/${id}/restore`, { method: 'PATCH' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_TERMS_QUERY_KEY })
    },
  })
}
