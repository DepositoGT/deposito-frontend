export type AnalyticsResponse = {
  year: number;
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
  const res = await fetch(`/api/analytics/summary?year=${year}`)
  if (!res.ok) throw new Error('No se pudo obtener el resumen de análisis')
  return res.json()
}
