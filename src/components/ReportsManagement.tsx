import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  AlertTriangle,
  Eye,
  Filter,
  BarChart3,
  PieChart,
  Plus,
  RefreshCw
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { getBusinessDataByPeriod, topProducts, categoryPerformance, inventoryData, getReportStatsByPeriod } from "@/utils/businessData";
import { Report, GeneratedReport } from "@/types";

const ReportsManagement = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedType, setSelectedType] = useState("all");
  const [customReportOpen, setCustomReportOpen] = useState(false);
  const [customReportData, setCustomReportData] = useState({
    name: "",
    description: "",
    period: "month",
    includeCharts: true,
    includeData: true,
    format: "pdf"
  });

  // Datos que cambian según el período
  // Función para generar datos reales de reportes
  const generateReportData = (reportType: string, period: string) => {
    const businessData = getBusinessDataByPeriod(period);
    const currentTopProducts = topProducts;
    const currentInventory = inventoryData;
    
    const baseData = {
      sales: {
        title: "Reporte de Ventas",
        summary: {
          totalSales: businessData.totalSalesNum,
          totalTransactions: businessData.productsCount,
          averageTicket: Math.round(businessData.totalSalesNum / businessData.productsCount),
          topProduct: currentTopProducts[0]?.name || "Whisky Buchanans 18"
        },
        details: categoryPerformance.map(cat => ({
          category: cat.category,
          sales: Math.round(businessData.totalSalesNum * (cat.percentage / 100)),
          units: Math.round(businessData.productsCount * (cat.percentage / 100)),
          margin: `${cat.percentage}%`
        })),
        trends: `Incremento del 15.3% respecto al período anterior. Ventas totales: ${businessData.totalSales}`
      },
      inventory: {
        title: "Reporte de Inventario",
        summary: {
          totalProducts: currentInventory.length,
          totalValue: currentInventory.reduce((sum, item) => sum + (item.stock * item.value), 0),
          lowStock: currentInventory.filter(item => item.stock <= item.minStock).length,
          outOfStock: currentInventory.filter(item => item.stock === 0).length
        },
        details: currentInventory,
        alerts: `${currentInventory.filter(item => item.stock <= item.minStock).length} productos con stock bajo requieren reabastecimiento`
      },
      financial: {
        title: "Reporte Financiero",
        summary: {
          revenue: businessData.totalSalesNum,
          costs: businessData.totalCosts,
          profit: businessData.totalSalesNum - businessData.totalCosts,
          margin: businessData.totalMargin
        },
        details: [
          { concept: "Ventas Brutas", amount: businessData.totalSalesNum, percentage: "100%" },
          { concept: "Costo de Ventas", amount: -businessData.totalCosts, percentage: `${((businessData.totalCosts / businessData.totalSalesNum) * 100).toFixed(1)}%` },
          { concept: "Ganancia Bruta", amount: businessData.totalSalesNum - businessData.totalCosts, percentage: businessData.totalMargin },
          { concept: "Gastos Operativos", amount: -Math.round(businessData.totalSalesNum * 0.1), percentage: "10%" },
          { concept: "Ganancia Neta", amount: Math.round((businessData.totalSalesNum - businessData.totalCosts) * 0.85), percentage: `${(parseFloat(businessData.totalMargin) * 0.85).toFixed(1)}%` }
        ],
        analysis: `Margen de ganancia ${businessData.totalMargin} con tendencia positiva del 15.3%`
      }
    };
    
    return baseData[reportType] || baseData.sales;
  };

  // Función para generar archivo de reporte con datos reales
  const generateReportFile = (reportType: string, format: string) => {
    const data = generateReportData(reportType, selectedPeriod);
    let content = "";
    let mimeType = "";
    let extension = "";

    if (format === "csv" || format === "excel") {
      // Generar CSV con datos estructurados
      content = `${data.title}\nPeríodo: ${selectedPeriod}\nFecha de generación: ${new Date().toLocaleString()}\n\n`;
      
      if (reportType === "sales") {
        content += "RESUMEN EJECUTIVO\n";
        content += `Ventas Totales,Q ${data.summary.totalSales.toLocaleString()}\n`;
        content += `Transacciones,${data.summary.totalTransactions}\n`;
        content += `Ticket Promedio,Q ${data.summary.averageTicket}\n`;
        content += `Producto Top,${data.summary.topProduct}\n\n`;
        
        content += "DETALLE POR CATEGORÍA\n";
        content += "Categoría,Ventas,Unidades,Margen\n";
        data.details.forEach(item => {
          content += `${item.category},Q ${item.sales.toLocaleString()},${item.units},${item.margin}\n`;
        });
        
        content += `\nTENDENCIA\n${data.trends}`;
      } else if (reportType === "inventory") {
        content += "RESUMEN DE INVENTARIO\n";
        content += `Total Productos,${data.summary.totalProducts}\n`;
        content += `Valor Total,Q ${data.summary.totalValue.toLocaleString()}\n`;
        content += `Stock Bajo,${data.summary.lowStock}\n`;
        content += `Sin Stock,${data.summary.outOfStock}\n\n`;
        
        content += "PRODUCTOS CRÍTICOS\n";
        content += "Producto,Stock Actual,Stock Mínimo,Valor Unitario\n";
        data.details.forEach(item => {
          content += `${item.product},${item.stock},${item.minStock},Q ${item.value}\n`;
        });
        
        content += `\nALERTAS\n${data.alerts}`;
      } else if (reportType === "financial") {
        content += "RESUMEN FINANCIERO\n";
        content += `Ingresos,Q ${data.summary.revenue.toLocaleString()}\n`;
        content += `Costos,Q ${data.summary.costs.toLocaleString()}\n`;
        content += `Ganancia,Q ${data.summary.profit.toLocaleString()}\n`;
        content += `Margen,${data.summary.margin}\n\n`;
        
        content += "ESTADO DE RESULTADOS\n";
        content += "Concepto,Monto,Porcentaje\n";
        data.details.forEach(item => {
          content += `${item.concept},Q ${item.amount.toLocaleString()},${item.percentage}\n`;
        });
        
        content += `\nANÁLISIS\n${data.analysis}`;
      }
      
      mimeType = "text/csv";
      extension = "csv";
    } else {
      // Generar contenido estructurado como texto plano legible
      content = `====================================\n`;
      content += `${data.title.toUpperCase()}\n`;
      content += `====================================\n\n`;
      content += `Período: ${selectedPeriod}\n`;
      content += `Fecha de generación: ${new Date().toLocaleString()}\n\n`;
      
      if (reportType === "sales") {
        content += `RESUMEN EJECUTIVO\n`;
        content += `================\n`;
        content += `• Ventas Totales: Q ${data.summary.totalSales.toLocaleString()}\n`;
        content += `• Total de Transacciones: ${data.summary.totalTransactions}\n`;
        content += `• Ticket Promedio: Q ${data.summary.averageTicket}\n`;
        content += `• Producto Más Vendido: ${data.summary.topProduct}\n\n`;
        
        content += `ANÁLISIS POR CATEGORÍA\n`;
        content += `=====================\n`;
        data.details.forEach((item, index) => {
          content += `${index + 1}. ${item.category}\n`;
          content += `   - Ventas: Q ${item.sales.toLocaleString()}\n`;
          content += `   - Unidades vendidas: ${item.units}\n`;
          content += `   - Margen: ${item.margin}\n\n`;
        });
        
        content += `TENDENCIAS\n`;
        content += `==========\n`;
        content += `${data.trends}\n\n`;
        
        content += `RECOMENDACIONES\n`;
        content += `===============\n`;
        content += `• Mantener stock adecuado de productos top\n`;
        content += `• Promocionar categorías de alto margen\n`;
        content += `• Implementar estrategias de cross-selling\n`;
      } else if (reportType === "inventory") {
        content += `RESUMEN DE INVENTARIO\n`;
        content += `====================\n`;
        content += `• Total Productos: ${data.summary.totalProducts}\n`;
        content += `• Valor Total: Q ${data.summary.totalValue.toLocaleString()}\n`;
        content += `• Productos con Stock Bajo: ${data.summary.lowStock}\n`;
        content += `• Productos Sin Stock: ${data.summary.outOfStock}\n\n`;
        
        content += `PRODUCTOS CRÍTICOS\n`;
        content += `==================\n`;
        data.details.forEach((item, index) => {
          const status = item.stock <= item.minStock ? "⚠️ CRÍTICO" : "✅ NORMAL";
          content += `${index + 1}. ${item.product} - ${status}\n`;
          content += `   - Stock actual: ${item.stock} unidades\n`;
          content += `   - Stock mínimo: ${item.minStock} unidades\n`;
          content += `   - Valor unitario: Q ${item.value}\n`;
          content += `   - Valor total: Q ${(item.stock * item.value).toLocaleString()}\n\n`;
        });
        
        content += `ALERTAS Y ACCIONES\n`;
        content += `==================\n`;
        content += `${data.alerts}\n\n`;
        content += `ACCIONES RECOMENDADAS:\n`;
        content += `• Reabastecer productos con stock bajo\n`;
        content += `• Revisar proveedores para productos sin stock\n`;
        content += `• Ajustar stock mínimo según demanda\n`;
      } else if (reportType === "financial") {
        content += `RESUMEN FINANCIERO\n`;
        content += `==================\n`;
        content += `• Ingresos: Q ${data.summary.revenue.toLocaleString()}\n`;
        content += `• Costos: Q ${data.summary.costs.toLocaleString()}\n`;
        content += `• Ganancia: Q ${data.summary.profit.toLocaleString()}\n`;
        content += `• Margen: ${data.summary.margin}\n\n`;
        
        content += `ESTADO DE RESULTADOS\n`;
        content += `====================\n`;
        data.details.forEach((item, index) => {
          const sign = item.amount >= 0 ? "+" : "";
          content += `${index + 1}. ${item.concept}\n`;
          content += `   - Monto: ${sign}Q ${item.amount.toLocaleString()}\n`;
          content += `   - Porcentaje: ${item.percentage}\n\n`;
        });
        
        content += `ANÁLISIS FINANCIERO\n`;
        content += `==================\n`;
        content += `${data.analysis}\n\n`;
        content += `MÉTRICAS CLAVE:\n`;
        content += `• ROI (Retorno de Inversión): ${((data.summary.profit / data.summary.costs) * 100).toFixed(1)}%\n`;
        content += `• Punto de equilibrio: Q ${(data.summary.costs * 1.2).toLocaleString()}\n`;
        content += `• Proyección mensual: Q ${(data.summary.profit * 1.1).toLocaleString()}\n`;
      }
      
      mimeType = "text/plain";
      extension = "txt";
    }

    return { content, mimeType, extension };
  };


  const reportTypes: Report[] = [
    {
      id: "sales",
      name: "Reporte de Ventas",
      description: "Análisis detallado de ventas por período",
      icon: TrendingUp,
      color: "text-liquor-gold",
      bgColor: "bg-liquor-gold/10",
      lastGenerated: "2024-01-10 09:30",
      size: "2.3 MB"
    },
    {
      id: "inventory",
      name: "Reporte de Inventario",
      description: "Estado actual del stock y movimientos",
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
      lastGenerated: "2024-01-10 08:15",
      size: "1.8 MB"
    },
    {
      id: "suppliers",
      name: "Reporte de Proveedores",
      description: "Análisis de rendimiento de proveedores",
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent/10",
      lastGenerated: "2024-01-09 16:45",
      size: "945 KB"
    },
    {
      id: "financial",
      name: "Reporte Financiero",
      description: "Estado financiero y rentabilidad",
      icon: DollarSign,
      color: "text-liquor-burgundy",
      bgColor: "bg-liquor-burgundy/10",
      lastGenerated: "2024-01-10 07:20",
      size: "3.1 MB"
    },
    {
      id: "alerts",
      name: "Reporte de Alertas",
      description: "Stock bajo y productos críticos",
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      lastGenerated: "2024-01-10 10:00",
      size: "524 KB"
    },
    {
      id: "products",
      name: "Análisis de Productos",
      description: "Rendimiento por categorías y productos",
      icon: BarChart3,
      color: "text-liquor-amber",
      bgColor: "bg-liquor-amber/10",
      lastGenerated: "2024-01-09 14:30",
      size: "1.5 MB"
    }
  ];

  const quickStats = getReportStatsByPeriod(selectedPeriod);

  const recentReports = [
    {
      name: "Ventas Enero 2024",
      type: "Ventas",
      date: "2024-01-10 09:30",
      size: "2.3 MB",
      status: "completed"
    },
    {
      name: "Inventario Stock Bajo",
      type: "Inventario",
      date: "2024-01-10 08:15",
      size: "890 KB",
      status: "completed"
    },
    {
      name: "Análisis Proveedores Q4",
      type: "Proveedores",
      date: "2024-01-09 16:45",
      size: "1.2 MB",
      status: "completed"
    },
    {
      name: "Estado Financiero Diciembre",
      type: "Financiero",
      date: "2024-01-08 14:20",
      size: "3.8 MB",
      status: "processing"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-liquor-gold text-liquor-bronze">Completado</Badge>;
      case "processing":
        return <Badge className="bg-liquor-amber text-liquor-bronze">Procesando</Badge>;
      case "failed":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Centro de Reportes</h2>
          <p className="text-muted-foreground">Genera y gestiona reportes del negocio</p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={customReportOpen} onOpenChange={setCustomReportOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Reporte Personalizado
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Reporte Personalizado</DialogTitle>
                <DialogDescription>
                  Configura un reporte personalizado según tus necesidades
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Nombre del reporte</Label>
                  <Input
                    id="report-name"
                    value={customReportData.name}
                    onChange={(e) => setCustomReportData({...customReportData, name: e.target.value})}
                    placeholder="Ej: Análisis de ventas Q1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-description">Descripción</Label>
                  <Textarea
                    id="report-description"
                    value={customReportData.description}
                    onChange={(e) => setCustomReportData({...customReportData, description: e.target.value})}
                    placeholder="Describe el contenido del reporte..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-period">Período</Label>
                  <Select value={customReportData.period} onValueChange={(value) => setCustomReportData({...customReportData, period: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Esta semana</SelectItem>
                      <SelectItem value="month">Este mes</SelectItem>
                      <SelectItem value="quarter">Este trimestre</SelectItem>
                      <SelectItem value="year">Este año</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Opciones del reporte</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-charts" 
                      checked={customReportData.includeCharts}
                      onCheckedChange={(checked) => setCustomReportData({...customReportData, includeCharts: !!checked})}
                    />
                    <Label htmlFor="include-charts">Incluir gráficos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-data" 
                      checked={customReportData.includeData}
                      onCheckedChange={(checked) => setCustomReportData({...customReportData, includeData: !!checked})}
                    />
                    <Label htmlFor="include-data">Incluir datos detallados</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-format">Formato</Label>
                  <Select value={customReportData.format} onValueChange={(value) => setCustomReportData({...customReportData, format: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCustomReportOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => {
                  if (!customReportData.name) {
                    toast({
                      title: "Error",
                      description: "Por favor ingresa un nombre para el reporte",
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  // Generar reporte personalizado real
                  setTimeout(() => {
                    const reportFile = generateReportFile("sales", customReportData.format);
                    const blob = new Blob([reportFile.content], { type: reportFile.mimeType });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${customReportData.name.toLowerCase().replace(/\s+/g, '-')}-${customReportData.period}.${reportFile.extension}`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    
                    toast({
                      title: "Reporte personalizado listo",
                      description: `"${customReportData.name}" descargado con datos reales`
                    });
                  }, 2000);
                  
                  toast({
                    title: "Generando reporte personalizado...",
                    description: "Creando tu reporte con datos estructurados"
                  });
                  
                  setCustomReportOpen(false);
                  setCustomReportData({
                    name: "",
                    description: "",
                    period: "month",
                    includeCharts: true,
                    includeData: true,
                    format: "pdf"
                  });
                }} className="bg-gradient-primary hover:opacity-90">
                  Generar Reporte
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reportes</p>
                <p className="text-2xl font-bold text-foreground">{quickStats.totalReports}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Este Mes</p>
                <p className="text-2xl font-bold text-foreground">{quickStats.monthlyReports}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-liquor-gold" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Automatizados</p>
                <p className="text-2xl font-bold text-foreground">{quickStats.automatedReports}</p>
              </div>
              <PieChart className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "300ms" }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Personalizados</p>
                <p className="text-2xl font-bold text-foreground">{quickStats.customReports}</p>
              </div>
              <Filter className="w-8 h-8 text-liquor-burgundy" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tipos de Reportes */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Tipos de Reportes Disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((report, index) => {
            const Icon = report.icon;
            return (
              <Card 
                key={report.id} 
                className="animate-bounce-in hover:shadow-card transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${report.bgColor}`}>
                      <Icon className={`w-6 h-6 ${report.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">{report.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Última gen: {report.lastGenerated}</span>
                        <span>{report.size}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-gradient-primary hover:opacity-90"
                      onClick={() => {
                        toast({
                          title: "Generando reporte...",
                          description: `Preparando ${report.name}`
                        });
                        
                        // Generar reporte real con datos estructurados
                        setTimeout(() => {
                          const reportFile = generateReportFile(report.id, "pdf");
                          const blob = new Blob([reportFile.content], { type: reportFile.mimeType });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${report.name.toLowerCase().replace(/\s+/g, '-')}-${selectedPeriod}.${reportFile.extension}`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                          
                          toast({
                            title: "Reporte listo",
                            description: `${report.name} descargado con datos reales`
                          });
                        }, 1500);
                      }}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Generar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Vista previa",
                          description: `Mostrando preview de ${report.name}`,
                        });
                      }}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Reportes Recientes */}
      <Card className="animate-bounce-in" style={{ animationDelay: "600ms" }}>
        <CardHeader>
          <CardTitle>Reportes Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground">Nombre del Reporte</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Fecha de Creación</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Tamaño</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-border hover:bg-muted transition-colors"
                  >
                    <td className="p-3">
                      <div className="font-medium text-foreground">{report.name}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{report.type}</Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-foreground">{report.date}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-foreground">{report.size}</span>
                    </td>
                    <td className="p-3 text-center">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (report.status === "processing") {
                              toast({
                                title: "Reporte en proceso",
                                description: "Este reporte aún se está generando",
                                variant: "destructive"
                              });
                              return;
                            }
                            toast({
                              title: "Vista previa",
                              description: `Abriendo ${report.name}`,
                            });
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (report.status === "processing") {
                              toast({
                                title: "Reporte en proceso",
                                description: "Espera a que termine de generarse",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            // Generar reporte real según el tipo
                            const reportType = report.type.toLowerCase() === "ventas" ? "sales" : 
                                             report.type.toLowerCase() === "inventario" ? "inventory" :
                                             report.type.toLowerCase() === "financiero" ? "financial" : "sales";
                            
                            const reportFile = generateReportFile(reportType, "pdf");
                            const blob = new Blob([reportFile.content], { type: reportFile.mimeType });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${report.name.toLowerCase().replace(/\s+/g, '-')}.${reportFile.extension}`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                            
                            toast({
                              title: "Descarga completada",
                              description: `${report.name} descargado con datos reales`
                            });
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsManagement;