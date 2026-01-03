import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  BarChart3
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnalytics } from "@/hooks/useAnalytics";

const Analytics = () => {
  // Filtro de año desde 2025 hasta el actual, con opción "Todos"
  const currentYear = new Date().getFullYear();
  const initialYear = currentYear < 2025 ? 2025 : currentYear;
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(initialYear);
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = 2025; y <= currentYear; y++) list.push(y);
    return list;
  }, [currentYear]);

  const { data, isLoading } = useAnalytics(selectedYear);
  const salesData = useMemo(() => {
    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return (data?.monthly ?? []).map((m) => ({ 
      month: months[m.month - 1], 
      ventas: m.ventas,  // Bruto
      ventasNetas: m.ventasNetas || (m.ventas - (m.devoluciones || 0)),  // Neto
      devoluciones: m.devoluciones || 0,
      costo: m.costo 
    }));
  }, [data]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Análisis y Reportes</h2>
          <p className="text-muted-foreground">Insights detallados de tu negocio</p>
        </div>
        <div className="flex space-x-2">
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(v === 'all' ? 'all' : Number(v))}
          >
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="all" value="all">Todos</SelectItem>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Export removed as requested */}
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Ventas Netas</p>
                <p className="text-2xl font-bold text-green-700">{isLoading ? '...' : (data?.totals.totalSales?.toLocaleString?.('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00')}</p>
                {data?.totals.totalReturns && data.totals.totalReturns > 0 && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    <p className="text-xs text-muted-foreground line-through">Q {data.totals.totalSalesGross?.toFixed(2)}</p>
                    <p className="text-xs text-orange-600">(-) Dev: Q {data.totals.totalReturns.toFixed(2)}</p>
                  </div>
                )}
              </div>
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Margen Promedio</p>
                <p className="text-2xl font-bold text-foreground">{isLoading ? '...' : (() => {
                  const sales = data?.totals.totalSales || 0;
                  const profit = (data?.totals.totalProfit || 0);
                  const pct = sales > 0 ? ((profit / sales) * 100).toFixed(1) : '0.0';
                  return `${pct}%`;
                })()}</p>
                {/* removed mock growth badge */}
              </div>
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center text-accent-foreground">
                <TrendingUp className="w-6 h-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Productos Vendidos</p>
                <p className="text-2xl font-bold text-foreground">{isLoading ? '...' : (data?.totals.productsCount?.toLocaleString?.() ?? '0')}</p>
                {/* removed mock growth badge */}
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "300ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Rotación Stock</p>
                <p className="text-2xl font-bold text-foreground">{isLoading ? '...' : (data?.totals.stockRotation ?? 0)}</p>
              </div>
              <div className="w-12 h-12 bg-liquor-gold/20 rounded-lg flex items-center justify-center">
                <Filter className="w-6 h-6 text-liquor-gold" />
              </div>
            </div>
            {!isLoading && data && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground italic">
                  {(() => {
                    const rotation = data.totals.stockRotation;
                    if (rotation >= 300) return "🚀 Excelente rotación! Tu inventario se mueve muy rápido.";
                    if (rotation >= 200) return "✅ Buena rotación. El inventario tiene movimiento saludable.";
                    if (rotation >= 100) return "⚠️ Rotación moderada. Considera promocionar productos lentos.";
                    if (rotation >= 50) return "⚡ Rotación baja. Revisa productos con poco movimiento.";
                    return "🔴 Rotación muy baja. Urgente: optimiza tu inventario.";
                  })()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos y Análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por Mes */}
        <Card className="animate-bounce-in">
          <CardHeader>
            <CardTitle>Tendencia de Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesData.map((month, index) => {
                const ventasNetas = month.ventasNetas;
                const profit = ventasNetas - month.costo;
                const margin = ventasNetas > 0 ? ((profit / ventasNetas) * 100).toFixed(1) : '0.0';
                const hasDevoluciones = month.devoluciones > 0;
                
                return (
                  <div key={month.month} className="flex items-center space-x-4">
                    <div className="w-12 text-sm font-medium text-muted-foreground">
                      {month.month}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-green-700">Q {ventasNetas.toLocaleString()}</span>
                          {hasDevoluciones && (
                            <div className="flex gap-2 text-xs">
                              <span className="text-muted-foreground line-through">Q {month.ventas.toFixed(2)}</span>
                              <span className="text-orange-600">-Q {month.devoluciones.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{margin}% margen</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(() => { const max = Math.max(1, ...(salesData.map(d => d.ventasNetas) as number[])); return (ventasNetas / max) * 100; })()}%`,
                            animationDelay: `${index * 100}ms`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Productos */}
        <Card className="animate-bounce-in" style={{ animationDelay: "200ms" }}>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data?.topProducts ?? []).map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{product.name}</div>
                    <div className="text-sm text-muted-foreground">{product.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foreground">Q {product.revenue.toLocaleString()}</div>
                    <div className="flex items-center justify-end">
                      <span className="text-sm text-muted-foreground mr-2">{product.ventas} unidades</span>
                      <TrendingUp className="w-3 h-3 text-liquor-gold" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

  {/* Rendimiento por Categoría (reemplazo sin gradients) */}
      <Card className="animate-bounce-in" style={{ animationDelay: "400ms" }}>
        <CardHeader>
          <CardTitle>Rendimiento por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {[...((data?.categoryPerformance ?? []) as import("@/services/analyticsService").AnalyticsResponse["categoryPerformance"])]
              .sort((a,b) => (b.percentage || 0) - (a.percentage || 0))
              .map((cat, idx) => {
                const pct = Math.max(0, Math.min(100, cat.percentage || 0))
                const radius = 42; // circle radius
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (pct / 100) * circumference;
                return (
                  <div key={`${cat.category}-${idx}`} className="text-center">
                    <svg width={96} height={96} className="mx-auto">
                      <circle
                        cx={48}
                        cy={48}
                        r={radius}
                        stroke="#e5e7eb"
                        strokeWidth={8}
                        fill="none"
                      />
                      <circle
                        cx={48}
                        cy={48}
                        r={radius}
                        stroke="#f59e0b"
                        strokeWidth={8}
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                      />
                      <text
                        x="50%"
                        y="50%"
                        dominantBaseline="middle"
                        textAnchor="middle"
                        className="fill-foreground font-semibold"
                        fontSize={16}
                      >{pct}%</text>
                    </svg>
                    <div className="mt-2 text-sm font-medium text-foreground truncate" title={cat.category}>{cat.category}</div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;