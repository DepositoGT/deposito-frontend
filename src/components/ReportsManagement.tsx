import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  AlertTriangle,
  BarChart3
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
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Report, GeneratedReport } from "@/types";

const ReportsManagement = () => {
  // Period is selected via modal filters now
  const currentYear = new Date().getFullYear();
  const initialYear = currentYear < 2025 ? 2025 : currentYear;
  // Modal de filtros
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingReport, setPendingReport] = useState<Report | null>(null);
  const [fPeriod, setFPeriod] = useState<'week'|'month'|'quarter'|'semester'|'year'|'all'>('month');
  const [fYear, setFYear] = useState<number|'all'>(initialYear);
  const [fMonth, setFMonth] = useState<number | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);
  const [fSem, setFSem] = useState<1|2>(1);
  const [fFormat, setFFormat] = useState<'pdf'|'csv'>('pdf');

  // Generadores locales (mock) removidos. Toda la generación ocurre en el backend.


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

  // Eliminados: quickStats, recentReports y getStatusBadge

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <Dialog open={filtersOpen} onOpenChange={(o)=>{ if(!o){ setPendingReport(null);} setFiltersOpen(o) }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Generar {pendingReport?.name || 'Reporte'}</DialogTitle>
            <DialogDescription>Configura los filtros antes de generar el documento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Período</p>
                <Select value={fPeriod} onValueChange={(v)=>{ setFPeriod(v as 'week'|'month'|'quarter'|'semester'|'year'|'all'); if(v!=='month'){ setFMonth(null);} }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mes</SelectItem>
                    <SelectItem value="quarter">Trimestre</SelectItem>
                    <SelectItem value="semester">Semestre</SelectItem>
                    <SelectItem value="year">Año</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Formato</p>
                <Select value={fFormat} onValueChange={(v)=> setFFormat(v as 'pdf'|'csv')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV / Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Año</p>
                <Select value={String(fYear)} onValueChange={(v)=> setFYear(v==='all' ? 'all' : Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Array.from({ length: currentYear - 2025 + 1 }, (_, i) => 2025 + i).map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {fPeriod === 'month' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Mes</p>
                  <Select value={fMonth? String(fMonth): ''} onValueChange={(v)=> setFMonth(Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Selecciona mes" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({length:12}, (_,i)=> i+1).map(m => (
                        <SelectItem key={m} value={String(m)}>{m.toString().padStart(2,'0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {fPeriod === 'semester' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Semestre</p>
                  <Select value={String(fSem)} onValueChange={(v)=> setFSem(v==='2' ? 2 : 1)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {fPeriod === 'quarter' && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Trimestre</p>
                <Select value={String(Math.ceil((fMonth||new Date().getMonth()+1)/3))} onValueChange={(v)=>{
                  const q = Number(v); const qm = (q-1)*3+1; setFMonth(qm)
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" onClick={()=>{ setFiltersOpen(false); setPendingReport(null); }} disabled={isGeneratingReport}>Cancelar</Button>
              <Button
                className="bg-liquor-amber hover:bg-liquor-amber/90 text-white"
                disabled={isGeneratingReport}
                onClick={async ()=>{
                  if(!pendingReport){ return }
                  setIsGeneratingReport(true);
                  try {
                    toast({ title:'Generando...', description: pendingReport.name })
                    const params = new URLSearchParams()
                    params.set('period', fPeriod)
                    if (fYear !== 'all') params.set('year', String(fYear))
                    if (fPeriod === 'month' && fMonth) params.set('month', String(fMonth))
                    if (fPeriod === 'quarter' && fMonth) params.set('quarter', String(Math.ceil(fMonth/3)))
                    if (fPeriod === 'semester') params.set('semester', String(fSem))
                    params.set('format', fFormat)
                    const res = await fetch(`/api/reports/${pendingReport.id}?${params.toString()}`)
                    if(!res.ok) throw new Error('Error al generar el reporte')
                    const blob = await res.blob()
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    const ext = fFormat === 'pdf' ? 'pdf' : 'csv'
                    a.href = url
                    a.download = `${pendingReport.name.toLowerCase().replace(/\s+/g,'-')}-${fPeriod}.${ext}`
                    a.click()
                    window.URL.revokeObjectURL(url)
                    toast({ title:'Reporte listo', description:`${pendingReport.name} descargado` })
                  } catch(err){
                    const msg = err instanceof Error ? err.message : 'No se pudo generar el reporte'
                    toast({ title:'Error', description: msg, variant:'destructive' })
                  } finally {
                    setIsGeneratingReport(false);
                    setFiltersOpen(false)
                    setPendingReport(null)
                  }
                }}
              >
                {isGeneratingReport ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Generando...
                  </>
                ) : (
                  "Generar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Centro de Reportes</h2>
          <p className="text-muted-foreground">Genera y gestiona reportes del negocio</p>
        </div>
        <div />
      </div>

      {/* Se removieron estadísticas rápidas */}

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
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-liquor-amber hover:bg-liquor-amber/90 text-white"
                      disabled={generatingReportId === report.id}
                      onClick={async () => {
                        if (report.id === 'inventory') {
                          // Descargar directamente el mismo PDF usado en Gestión de Productos
                          setGeneratingReportId(report.id);
                          try {
                            toast({ title:'Generando...', description: report.name })
                            const res = await fetch(`/api/products/report.pdf`)
                            if(!res.ok) throw new Error('Error al generar el reporte de inventario')
                            const blob = await res.blob()
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `productos_reporte.pdf`
                            a.click()
                            window.URL.revokeObjectURL(url)
                            toast({ title:'Reporte listo', description:`${report.name} descargado` })
                          } catch(err){
                            const msg = err instanceof Error ? err.message : 'No se pudo generar el reporte'
                            toast({ title:'Error', description: msg, variant:'destructive' })
                          } finally {
                            setGeneratingReportId(null);
                          }
                          return
                        }
                        setPendingReport(report)
                        setFiltersOpen(true)
                      }}
                    >
                      {generatingReportId === report.id ? (
                        <>
                          <svg className="animate-spin w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          Generando...
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 mr-1" />
                          Generar
                        </>
                      )}
                    </Button>
                    {/* Botón de vista previa removido */}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Reportes recientes removidos */}
    </div>
  );
};

export default ReportsManagement;