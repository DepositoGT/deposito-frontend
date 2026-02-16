/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { apiFetch } from './api'

export interface IncomingMerchandiseItem {
  id: string
  product: {
    id: string
    name: string
    brand?: string | null
    size?: string | null
    barcode?: string | null
    cost?: number
    price?: number
    stock?: number
  }
  quantity: number
  unit_cost: number
  subtotal: number
}

export interface IncomingMerchandise {
  id: string
  supplier: {
    id: string
    name: string
    contact?: string | null
    email?: string | null
    phone?: string | null
  }
  registeredBy: {
    id: string
    name: string
    email?: string | null
  }
  date: string
  notes?: string | null
  itemsCount: number
  totalValue: number
  items: IncomingMerchandiseItem[]
}

export interface IncomingMerchandiseQueryParams {
  page?: number
  pageSize?: number
  supplier_id?: string
  start_date?: string
  end_date?: string
  search?: string
  /** Si es false, la query no se ejecuta (para uso en hooks). No se envía al API. */
  enabled?: boolean
}

export interface IncomingMerchandiseResponse {
  items: IncomingMerchandise[]
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  nextPage: number | null
  prevPage: number | null
}

export const fetchIncomingMerchandise = async (
  params?: IncomingMerchandiseQueryParams
): Promise<IncomingMerchandiseResponse> => {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.supplier_id) search.set('supplier_id', params.supplier_id)
  if (params?.start_date) search.set('start_date', params.start_date)
  if (params?.end_date) search.set('end_date', params.end_date)
  if (params?.search) search.set('search', params.search)

  const url = `/api/incoming-merchandise${search.toString() ? `?${search.toString()}` : ''}`
  return apiFetch<IncomingMerchandiseResponse>(url, { method: 'GET' })
}

export const getIncomingMerchandiseById = async (id: string): Promise<IncomingMerchandise> => {
  return apiFetch<IncomingMerchandise>(`/api/incoming-merchandise/${id}`, { method: 'GET' })
}

export const generateMerchandiseReport = async (params?: {
  supplier_id?: string
  start_date?: string
  end_date?: string
}): Promise<Blob> => {
  const search = new URLSearchParams()
  if (params?.supplier_id) search.set('supplier_id', params.supplier_id)
  if (params?.start_date) search.set('start_date', params.start_date)
  if (params?.end_date) search.set('end_date', params.end_date)

  const url = `/api/incoming-merchandise/report/pdf${search.toString() ? `?${search.toString()}` : ''}`
  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}${url}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
    },
  })

  if (!response.ok) {
    throw new Error('Error al generar el reporte')
  }

  return response.blob()
}
