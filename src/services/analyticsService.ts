/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { getApiBaseUrl } from '@/services/api'

export type AnalyticsResponse = {
  year: number;
  /** Año calendario (zona GT) de la venta completada más antigua; si no hay ventas, año actual. */
  firstSaleYear: number;
  totals: {
    totalSales: number; // Ventas netas (con devoluciones restadas)
    totalSalesGross?: number; // Ventas brutas (sin restar devoluciones)
    totalReturns?: number; // Total devuelto
    totalCost: number;
    totalProfit: number;
    productsCount: number;
    stockRotation: number;
  };
  monthly: {
    month: number;
    ventas: number;
    costo: number;
    devoluciones?: number;
    ventasNetas?: number;
  }[];
  topProducts: { id: string; name: string; category: string; ventas: number; revenue: number }[];
  categoryPerformance: { category: string; revenue: number; percentage: number }[];
}

export async function getAnalytics(year: number | 'all'): Promise<AnalyticsResponse> {
  const res = await fetch(`${getApiBaseUrl()}/analytics/summary?year=${year}`)
  if (!res.ok) throw new Error('No se pudo obtener el resumen de análisis')
  return res.json()
}

export async function getAnalyticsFirstSaleYear(): Promise<{ firstSaleYear: number }> {
  const res = await fetch(`${getApiBaseUrl()}/analytics/first-sale-year`)
  if (!res.ok) throw new Error('No se pudo obtener el año de la primera venta')
  return res.json()
}
