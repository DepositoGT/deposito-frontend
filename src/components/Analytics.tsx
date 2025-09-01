import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
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
import { toast } from "@/hooks/use-toast";
import { getBusinessDataByPeriod, topProducts, categoryPerformance } from "@/utils/businessData";

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("30days");
  
  const currentData = getBusinessDataByPeriod(selectedPeriod);
  const salesData = currentData.salesData;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Análisis y Reportes</h2>
          <p className="text-muted-foreground">Insights detallados de tu negocio</p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Últimos 7 días</SelectItem>
              <SelectItem value="30days">Últimos 30 días</SelectItem>
              <SelectItem value="90days">Últimos 3 meses</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => {
            const periodText = {
              "7days": "últimos 7 días",
              "30days": "últimos 30 días", 
              "90days": "últimos 3 meses",
              "year": "este año"
            }[selectedPeriod] || "período seleccionado";
            
            // Simular descarga de CSV
            const csvContent = `Período,Ventas,Costo,Ganancia\n${salesData.map(row => 
              `${row.month},${row.ventas},${row.costo},${row.ventas - row.costo}`
            ).join('\n')}`;
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte-analisis-${periodText.replace(/\s+/g, '-')}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            toast({
              title: "Reporte exportado",
              description: `Análisis de ${periodText} descargado como CSV`
            });
          }}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ventas Totales</p>
                <p className="text-2xl font-bold text-foreground">{currentData.totalSales}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-liquor-gold mr-1" />
                  <span className="text-xs text-liquor-gold">+15.3%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
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
                <p className="text-2xl font-bold text-foreground">{currentData.totalMargin}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-liquor-gold mr-1" />
                  <span className="text-xs text-liquor-gold">+2.1%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center">
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
                <p className="text-2xl font-bold text-foreground">{currentData.productsCount.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="w-3 h-3 text-accent mr-1" />
                  <span className="text-xs text-accent">-3.2%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "300ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rotación Stock</p>
                <p className="text-2xl font-bold text-foreground">{currentData.stockRotation}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-liquor-gold mr-1" />
                  <span className="text-xs text-liquor-gold">+0.8x</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-liquor-gold/20 rounded-lg flex items-center justify-center">
                <Filter className="w-6 h-6 text-liquor-gold" />
              </div>
            </div>
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
                const profit = month.ventas - month.costo;
                const margin = ((profit / month.ventas) * 100).toFixed(1);
                
                return (
                  <div key={month.month} className="flex items-center space-x-4">
                    <div className="w-12 text-sm font-medium text-muted-foreground">
                      {month.month}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground">Q {month.ventas.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">{margin}% margen</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(month.ventas / Math.max(...salesData.map(d => d.ventas))) * 100}%`,
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
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{product.name}</div>
                    <div className="text-sm text-muted-foreground">{product.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foreground">Q {product.revenue.toLocaleString()}</div>
                    <div className="flex items-center justify-end">
                      <span className="text-sm text-muted-foreground mr-2">{product.ventas} unidades</span>
                      {product.trend === "up" ? (
                        <TrendingUp className="w-3 h-3 text-liquor-gold" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-accent" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rendimiento por Categoría */}
      <Card className="animate-bounce-in" style={{ animationDelay: "400ms" }}>
        <CardHeader>
          <CardTitle>Rendimiento por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {categoryPerformance.map((category, index) => (
              <div key={index} className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-3">
                  <div className="absolute inset-0 bg-muted rounded-full"></div>
                  <div 
                    className={`absolute inset-0 ${category.color} rounded-full transition-all duration-1000`}
                    style={{ 
                      clipPath: `polygon(50% 50%, 50% 0%, ${50 + (category.percentage / 100) * 50}% 0%, 100% 100%, 0% 100%)`,
                      animationDelay: `${index * 200}ms`
                    }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{category.percentage}%</span>
                  </div>
                </div>
                <div className="font-medium text-foreground">{category.category}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;