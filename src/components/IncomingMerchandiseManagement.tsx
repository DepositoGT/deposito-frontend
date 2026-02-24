/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Search,
  Eye,
  FileText,
  Package,
  Calendar,
  User,
  Building2,
  LayoutGrid,
  List,
  Download,
  Plus,
  Filter,
  X
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useIncomingMerchandise, useIncomingMerchandiseById } from '@/hooks/useIncomingMerchandise'
import { useSuppliers } from '@/hooks/useSuppliers'
import { Pagination } from '@/components/shared/Pagination'
import { generateMerchandiseReport } from '@/services/incomingMerchandiseService'
import { useAuthPermissions } from '@/hooks/useAuthPermissions'
import type { IncomingMerchandise } from '@/services/incomingMerchandiseService'

const IncomingMerchandiseManagement = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { hasPermission } = useAuthPermissions()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Permissions (registrar ingreso usa products.register_incoming, igual que la ruta /inventario/registrar-ingreso)
  const canView = hasPermission('merchandise.view')
  const canRegister = hasPermission('products.register_incoming')
  const canDetails = hasPermission('merchandise.details')
  const canReports = hasPermission('merchandise.reports')

  // Data hooks
  const { data: recordsData, isLoading, refetch } = useIncomingMerchandise({
    page: currentPage,
    pageSize,
    search: searchTerm || undefined,
    supplier_id: selectedSupplierId !== 'all' ? selectedSupplierId : undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  })

  const { data: detailData } = useIncomingMerchandiseById(selectedRecordId || undefined)

  const { data: suppliersData } = useSuppliers()
  const suppliers = useMemo(() => suppliersData?.items ?? [], [suppliersData])

  const records: IncomingMerchandise[] = recordsData?.items ?? []
  const totalItems = recordsData?.totalItems ?? 0
  const totalPages = recordsData?.totalPages ?? 1

  // Reset page on filter or page size change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedSupplierId, startDate, endDate, pageSize])

  // Handlers
  const handleViewDetails = (id: string) => {
    setSelectedRecordId(id)
    setIsDetailOpen(true)
  }

  const handleGenerateReport = async () => {
    try {
      const blob = await generateMerchandiseReport({
        supplier_id: selectedSupplierId !== 'all' ? selectedSupplierId : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-mercancia-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Reporte generado',
        description: 'El reporte PDF se descargó correctamente',
      })
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'No se pudo generar el reporte'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedSupplierId('all')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!canView) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Sin acceso</h3>
            <p className="text-muted-foreground">
              No tienes permisos para ver los registros de mercancía.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold text-foreground">Registros de Mercancía</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Gestiona los ingresos de mercancía</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible">
          {canReports && (
            <Button variant="outline" onClick={handleGenerateReport} size="sm" className="shrink-0">
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Reporte</span>
            </Button>
          )}
          {canRegister && (
            <Button
              size="sm"
              onClick={() => navigate('/inventario/registrar-ingreso')}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Registro</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filtros</CardTitle>
            <div className="flex items-center gap-2">
              {(searchTerm || selectedSupplierId !== 'all' || startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="w-4 h-4 mr-1" />
                {isFilterOpen ? 'Ocultar' : 'Filtros'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {isFilterOpen && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Búsqueda</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Todos los proveedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proveedores</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">
            Registros ({totalItems})
          </CardTitle>
          <div className="flex items-center border rounded-md bg-background/80">
            <Button
              type="button"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => setViewMode('table')}
              aria-label="Vista de lista"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => setViewMode('cards')}
              aria-label="Vista de cuadros"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Cargando registros...</div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-16 h-16 mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No hay registros</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedSupplierId !== 'all' || startDate || endDate
                  ? 'No se encontraron registros con los filtros aplicados'
                  : 'Aún no hay registros de mercancía'}
              </p>
              {canRegister && (
                <Button onClick={() => navigate('/inventario/registrar-ingreso')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Mercancía
                </Button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">Fecha</th>
                    <th className="text-left p-2 font-semibold">Proveedor</th>
                    <th className="text-left p-2 font-semibold">Registrado por</th>
                    <th className="text-left p-2 font-semibold">Productos</th>
                    <th className="text-right p-2 font-semibold">Total</th>
                    <th className="text-center p-2 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">{formatDate(record.date)}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{record.supplier.name}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{record.registeredBy.name}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant="secondary">{record.itemsCount} productos</Badge>
                      </td>
                      <td className="p-2 text-right font-semibold">
                        {formatCurrency(record.totalValue)}
                      </td>
                      <td className="p-2">
                        <div className="flex justify-center gap-2">
                          {canDetails && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(record.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.map((record) => (
                <Card key={record.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">
                          {record.supplier.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(record.date)}
                        </p>
                      </div>
                      {canDetails && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(record.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{record.registeredBy.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        {record.itemsCount} {record.itemsCount === 1 ? 'producto' : 'productos'}
                      </Badge>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(record.totalValue)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination + page size */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items por página:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[72px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Registro</DialogTitle>
          </DialogHeader>
          {detailData ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Proveedor</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">{detailData.supplier.name}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(detailData.date)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Registrado por</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4" />
                    <span>{detailData.registeredBy.name}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total</Label>
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(detailData.totalValue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {detailData.notes && (
                <div>
                  <Label className="text-muted-foreground">Notas</Label>
                  <p className="mt-1 text-sm">{detailData.notes}</p>
                </div>
              )}

              {/* Items Table */}
              <div>
                <Label className="text-muted-foreground mb-2 block">Productos</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-semibold">Producto</th>
                        <th className="text-center p-3 font-semibold">Cantidad</th>
                        <th className="text-right p-3 font-semibold">Costo Unit.</th>
                        <th className="text-right p-3 font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{item.product.name}</div>
                              {(item.product.brand || item.product.size) && (
                                <div className="text-xs text-muted-foreground">
                                  {[item.product.brand, item.product.size].filter(Boolean).join(' - ')}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(item.unit_cost)}</td>
                          <td className="p-3 text-right font-semibold">
                            {formatCurrency(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted">
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-semibold">
                          Total:
                        </td>
                        <td className="p-3 text-right font-bold text-lg">
                          {formatCurrency(detailData.totalValue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando detalles...</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IncomingMerchandiseManagement
