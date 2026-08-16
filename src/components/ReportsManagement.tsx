/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWarehouses } from "@/services/warehouseService";
import { getApiBaseUrl, getAuthToken, tenantHeaders } from '@/services/api';
import { useTenant } from '@/context/useTenant';
import { useAuthPermissions } from '@/hooks/useAuthPermissions';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  VentasIcon,
  InventarioIcon,
  InventariadoIcon,
  ProveedoresIcon,
  ReporteFinancieroIcon,
  AlertasIcon,
  AnalyticsIcon,
  MercanciaIcon,
} from "@/components/icons/CustomIcons";
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
  const [fPeriod, setFPeriod] = useState<'week' | 'month' | 'quarter' | 'semester' | 'year' | 'all'>('month');
  const [fYear, setFYear] = useState<number | 'all'>(initialYear);
  const [fMonth, setFMonth] = useState<number | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [fSem, setFSem] = useState<1 | 2>(1);
  const [fFormat, setFFormat] = useState<'pdf' | 'csv'>('pdf');
  // Alcance del reporte: una sucursal, o 'all' = toda la empresa (consolidado).
  const { branch, branches } = useTenant();
  const { hasPermission } = useAuthPermissions();
  const canViewAll = hasPermission('branches.view_all');
  const [fBranch, setFBranch] = useState<string>(branch?.id || '');
  const showBranchPicker = branches.length > 1 || canViewAll;
  // Los almacenes son de la sucursal activa: acotar por almacén solo tiene
  // sentido cuando el reporte es de ella, no del consolidado ni de otra.
  const [fWarehouse, setFWarehouse] = useState<string>('all');
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', branch?.id],
    queryFn: () => fetchWarehouses(),
    enabled: filtersOpen,
  });
  const showWarehousePicker =
    (warehouses?.length ?? 0) > 1 && (!fBranch || fBranch === branch?.id);

  // Generadores locales (mock) removidos. Toda la generación ocurre en el backend.


  const reportTypes: Report[] = [
    {
      id: "sales",
      name: "Reporte de Ventas",
      description: "Análisis detallado de ventas por período",
      icon: VentasIcon,
      color: "text-liquor-gold",
      bgColor: "bg-liquor-gold/10",
      lastGenerated: "2024-01-10 09:30",
      size: "2.3 MB"
    },
    {
      id: "inventory",
      name: "Reporte de Inventario",
      description: "Estado actual del stock y movimientos",
      icon: InventarioIcon,
      color: "text-primary",
      bgColor: "bg-primary/10",
      lastGenerated: "2024-01-10 08:15",
      size: "1.8 MB"
    },
    {
      id: "inventory-counts",
      name: "Historial de inventariados",
      description: "Sesiones de conteo físico en el período: diferencias y mermas por sesión",
      icon: InventariadoIcon,
      color: "text-teal-600",
      bgColor: "bg-teal-500/10",
      lastGenerated: "—",
      size: "—"
    },
    {
      id: "suppliers",
      name: "Reporte de Proveedores",
      description: "Análisis de rendimiento de proveedores",
      icon: ProveedoresIcon,
      color: "text-accent",
      bgColor: "bg-accent/10",
      lastGenerated: "2024-01-09 16:45",
      size: "945 KB"
    },
    {
      id: "financial",
      name: "Reporte Financiero",
      description: "P&L del período, inventario actual, compras y margen por categoría",
      icon: ReporteFinancieroIcon,
      color: "text-liquor-burgundy",
      bgColor: "bg-liquor-burgundy/10",
      lastGenerated: "2024-01-10 07:20",
      size: "3.1 MB"
    },
    {
      id: "alerts",
      name: "Reporte de Alertas",
      description: "Reposición priorizada, concentración por categoría y tickets del sistema",
      icon: AlertasIcon,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      lastGenerated: "2024-01-10 10:00",
      size: "524 KB"
    },
    {
      id: "products",
      name: "Análisis de Productos",
      description: "Márgenes, mix por categoría y proveedor, rankings de valor",
      icon: AnalyticsIcon,
      color: "text-liquor-amber",
      bgColor: "bg-liquor-amber/10",
      lastGenerated: "2024-01-09 14:30",
      size: "1.5 MB"
    },
    {
      id: "merchandise",
      name: "Reporte de Mercancía",
      description: "Ingresos de mercancía del período: montos, estado de pago y por proveedor",
      icon: MercanciaIcon,
      color: "text-primary",
      bgColor: "bg-primary/10",
      lastGenerated: "—",
      size: "—"
    },
    {
      id: "stock-by-location",
      name: "Existencias por Almacén",
      description: "Unidades y valor por almacén, con el detalle de cada ubicación",
      icon: InventarioIcon,
      color: "text-primary",
      bgColor: "bg-primary/10",
      lastGenerated: "—",
      size: "—"
    },
    {
      id: "kardex",
      name: "Kardex por Ubicación",
      description: "Entradas, salidas y saldo de cada ubicación en el período",
      icon: InventariadoIcon,
      color: "text-teal-600",
      bgColor: "bg-teal-500/10",
      lastGenerated: "—",
      size: "—"
    },
    {
      id: "internal-moves",
      name: "Movimientos Internos",
      description: "Qué se movió de un anaquel a otro, cuánto y quién lo movió",
      icon: MercanciaIcon,
      color: "text-accent",
      bgColor: "bg-accent/10",
      lastGenerated: "—",
      size: "—"
    },
    {
      id: "replenishment",
      name: "Reposición Interna",
      description: "Anaqueles bajo su mínimo y de qué ubicación traer lo que falta",
      icon: AlertasIcon,
      color: "text-liquor-amber",
      bgColor: "bg-liquor-amber/10",
      lastGenerated: "—",
      size: "—"
    },
    {
      id: "occupancy",
      name: "Ocupación de Ubicaciones",
      description: "SKUs y unidades por ubicación, cuáles están vacías y cuáles con un solo producto",
      icon: AnalyticsIcon,
      color: "text-liquor-burgundy",
      bgColor: "bg-liquor-burgundy/10",
      lastGenerated: "—",
      size: "—"
    }
  ];

  // Eliminados: quickStats, recentReports y getStatusBadge

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <Dialog open={filtersOpen} onOpenChange={(o) => { if (!o) { setPendingReport(null); } setFiltersOpen(o) }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Generar {pendingReport?.name || 'Reporte'}</DialogTitle>
            <DialogDescription>Configura los filtros antes de generar el documento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {showBranchPicker && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Sucursal</p>
                <Select value={fBranch || branch?.id || ''} onValueChange={setFBranch}>
                  <SelectTrigger><SelectValue placeholder="Selecciona sucursal" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                    {canViewAll && <SelectItem value="all">Toda la empresa (consolidado)</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {fBranch === 'all'
                    ? 'El reporte suma todas las sucursales y las identifica una por una en su propio desglose.'
                    : 'El reporte incluye solo los datos de esta sucursal.'}
                </p>
              </div>
            )}
            {showWarehousePicker && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Almacén</p>
                <Select value={fWarehouse} onValueChange={setFWarehouse}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los almacenes</SelectItem>
                    {(warehouses ?? []).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Período</p>
                <Select value={fPeriod} onValueChange={(v) => { setFPeriod(v as 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'all'); if (v !== 'month') { setFMonth(null); } }}>
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
                <Select value={fFormat} onValueChange={(v) => setFFormat(v as 'pdf' | 'csv')}>
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
                <Select value={String(fYear)} onValueChange={(v) => setFYear(v === 'all' ? 'all' : Number(v))}>
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
                  <Select value={fMonth ? String(fMonth) : ''} onValueChange={(v) => setFMonth(Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Selecciona mes" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <SelectItem key={m} value={String(m)}>{m.toString().padStart(2, '0')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {fPeriod === 'semester' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Semestre</p>
                  <Select value={String(fSem)} onValueChange={(v) => setFSem(v === '2' ? 2 : 1)}>
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
                <Select value={String(Math.ceil((fMonth || new Date().getMonth() + 1) / 3))} onValueChange={(v) => {
                  const q = Number(v); const qm = (q - 1) * 3 + 1; setFMonth(qm)
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
              <Button variant="outline" onClick={() => { setFiltersOpen(false); setPendingReport(null); }} disabled={isGeneratingReport}>Cancelar</Button>
              <Button
                className="bg-liquor-amber hover:bg-liquor-amber/90 text-white"
                disabled={isGeneratingReport}
                onClick={async () => {
                  if (!pendingReport) { return }
                  setIsGeneratingReport(true);
                  try {
                    toast({ title: 'Generando...', description: pendingReport.name })
                    const params = new URLSearchParams()
                    params.set('period', fPeriod)
                    if (fYear !== 'all') params.set('year', String(fYear))
                    if (fPeriod === 'month' && fMonth) params.set('month', String(fMonth))
                    if (fPeriod === 'quarter' && fMonth) params.set('quarter', String(Math.ceil(fMonth / 3)))
                    if (fPeriod === 'semester') params.set('semester', String(fSem))
                    params.set('format', fFormat)
                    if (showWarehousePicker && fWarehouse !== 'all') params.set('warehouse_id', fWarehouse)
                    const token = getAuthToken()
                    // El alcance viaja en el header de tenant: un id de sucursal, o
                    // 'all' para el consolidado de la empresa (solo lectura).
                    const scopeBranch = fBranch || branch?.id || ''
                    const res = await fetch(`${getApiBaseUrl()}/reports/${pendingReport.id}?${params.toString()}`, {
                      credentials: 'include',
                      headers: {
                        ...tenantHeaders(),
                        ...(scopeBranch ? { 'X-Branch-Id': scopeBranch } : {}),
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                    })
                    if (!res.ok) throw new Error('Error al generar el reporte')
                    const blob = await res.blob()
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    const ext = fFormat === 'pdf' ? 'pdf' : 'csv'
                    a.href = url
                    a.download = `${pendingReport.name.toLowerCase().replace(/\s+/g, '-')}-${fPeriod}.${ext}`
                    a.click()
                    window.URL.revokeObjectURL(url)
                    toast({ title: 'Reporte listo', description: `${pendingReport.name} descargado` })
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'No se pudo generar el reporte'
                    toast({ title: 'Error', description: msg, variant: 'destructive' })
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
                      <Icon className="h-6 w-6" />
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
                      onClick={() => {
                        setPendingReport(report)
                        setFiltersOpen(true)
                      }}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Generar
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