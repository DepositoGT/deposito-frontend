/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 *
 * For licensing inquiries: GitHub @dpatzan2
 */

/**
 * Vista de detalle de un proveedor con pestañas:
 * - Detalles: información completa del proveedor (antes en modal).
 * - Entradas de mercancía: listado de ingresos asociados a este proveedor.
 */
import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Printer,
  Package,
  User,
  Calendar,
  Eye,
  Edit,
} from 'lucide-react'
import { useSupplier } from '@/hooks/useSupplier'
import { useIncomingMerchandise, useIncomingMerchandiseById } from '@/hooks/useIncomingMerchandise'
import { useToast } from '@/hooks/use-toast'
import { useAuthPermissions } from '@/hooks/useAuthPermissions'
import { adaptApiSupplier } from '@/services/supplierService'
import type { Supplier } from '@/types'
import { generateSupplierPDF, type SupplierPDFOptions, type SupplierPDFMerchandiseEntry } from '@/components/suppliers/generateSupplierPDF'
import { fetchIncomingMerchandise } from '@/services/incomingMerchandiseService'
import { Pagination } from '@/components/shared/Pagination'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useUpdateSupplier } from '@/hooks/useUpdateSupplier'
import type { IncomingMerchandise } from '@/services/incomingMerchandiseService'
import { useCategories } from '@/hooks/useCategories'
import { usePaymentTerms } from '@/hooks/usePaymentTerms'
import { useStatuses } from '@/hooks/useStatuses'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Check, ChevronsUpDown } from 'lucide-react'

const getStatusBadge = (status: string | undefined) =>
  status === 'active' ? (
    <Badge className="bg-liquor-gold text-liquor-bronze">Activo</Badge>
  ) : (
    <Badge variant="secondary">Inactivo</Badge>
  )

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(value)

const formatDate = (dateString: string) => {
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return new Intl.DateTimeFormat('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return dateString
  }
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { hasPermission } = useAuthPermissions()

  const [merchPage, setMerchPage] = useState(1)
  const [detailRecordId, setDetailRecordId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isPdfOptionsOpen, setIsPdfOptionsOpen] = useState(false)
  const [pdfOptions, setPdfOptions] = useState<SupplierPDFOptions>({
    includeBasic: true,
    includeMetrics: true,
    includeProducts: true,
    includeMerchandiseEntries: false,
  })
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const {
    data: rawSupplier,
    isLoading: supplierLoading,
    isError: supplierError,
    refetch: refetchSupplier,
  } = useSupplier(id ?? undefined)
  const supplier: Supplier | null = useMemo(
    () => (rawSupplier ? adaptApiSupplier(rawSupplier) : null),
    [rawSupplier]
  )

  const canViewMerchandise = hasPermission('merchandise.view')
  const { data: merchData, isLoading: merchLoading } = useIncomingMerchandise({
    supplier_id: id ?? undefined,
    page: merchPage,
    pageSize: 10,
    enabled: canViewMerchandise,
  })
  const { data: detailData } = useIncomingMerchandiseById(detailRecordId ?? undefined)

  const records: IncomingMerchandise[] = merchData?.items ?? []
  const totalPages = merchData?.totalPages ?? 1
  const canDetails = hasPermission('merchandise.details')
  const canEditSupplier = hasPermission('suppliers.edit')

  const updateSupplierMutation = useUpdateSupplier()
  const { mutateAsync: updateSupplierAsync, isPending: isUpdating } = updateSupplierMutation

  const { data: categoriesData } = useCategories()
  const { data: paymentTermsData } = usePaymentTerms()
  const { data: statusesData } = useStatuses()

  const categories = useMemo(() => {
    if (!categoriesData) return [] as Array<{ id: number | string; name: string }>
    if (Array.isArray(categoriesData)) {
      return categoriesData as Array<{ id: number | string; name: string }>
    }
    return (categoriesData as { items?: Array<{ id: number | string; name: string }> }).items ?? []
  }, [categoriesData])

  const paymentTerms = useMemo(() => {
    if (Array.isArray(paymentTermsData)) {
      return paymentTermsData
    }
    return paymentTermsData?.items ?? []
  }, [paymentTermsData])

  const statuses = useMemo(() => statusesData ?? [], [statusesData])

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editContact, setEditContact] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([])
  const [editPaymentTermId, setEditPaymentTermId] = useState<string | undefined>(undefined)
  const [editStatusId, setEditStatusId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!supplier) return
    setEditName(supplier.name ?? '')
    setEditContact(supplier.contact ?? '')
    setEditPhone(supplier.phone ?? '')
    setEditEmail(supplier.email ?? '')
    setEditAddress(supplier.address ?? '')
    // No tenemos directamente los IDs, así que dejamos los selects en blanco;
    // el usuario podrá elegir nuevos valores si los quiere cambiar.
    setEditCategoryIds([])
    setEditPaymentTermId(undefined)
    setEditStatusId(undefined)
  }, [supplier])

  const handleSave = async () => {
    if (!supplier || !id) return
    try {
      await updateSupplierAsync({
        id,
        payload: {
          name: editName,
          contact: editContact,
          phone: editPhone,
          email: editEmail,
          address: editAddress,
          category_ids: editCategoryIds.length ? editCategoryIds : undefined,
          payment_terms_id: editPaymentTermId,
          status_id: editStatusId,
        },
      })
      await refetchSupplier()
      toast({
        title: 'Proveedor actualizado',
        description: `Los datos de "${editName}" se guardaron correctamente`,
      })
      setIsEditing(false)
    } catch (e) {
      toast({
        title: 'Error al actualizar',
        description: (e as Error)?.message ?? 'No se pudo actualizar el proveedor',
        variant: 'destructive',
      })
    }
  }

  if (!id) {
    navigate('/proveedores')
    return null
  }

  if (supplierError || (rawSupplier === null && !supplierLoading)) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/proveedores')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="mt-6 text-center text-destructive">Proveedor no encontrado.</div>
      </div>
    )
  }

  if (supplierLoading || !supplier) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/proveedores')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{supplier.name}</h1>
            <p className="text-sm text-muted-foreground">Detalle del proveedor</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEditSupplier && !isEditing && (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              disabled={isUpdating}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
          <Button
            variant="outline"
            className="border-liquor-amber text-liquor-amber hover:bg-liquor-amber/10"
            onClick={() => setIsPdfOptionsOpen(true)}
          >
            <Printer className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Diálogo: qué información incluir en el PDF */}
      <Dialog open={isPdfOptionsOpen} onOpenChange={setIsPdfOptionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contenido del PDF</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Seleccione la información que desea incluir en el reporte del proveedor.
          </p>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pdf-basic"
                checked={pdfOptions.includeBasic ?? true}
                onCheckedChange={(checked) =>
                  setPdfOptions((o) => ({ ...o, includeBasic: checked === true }))
                }
              />
              <label
                htmlFor="pdf-basic"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Información básica (empresa, contacto, dirección, categorías, estado, términos de pago)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pdf-metrics"
                checked={pdfOptions.includeMetrics ?? true}
                onCheckedChange={(checked) =>
                  setPdfOptions((o) => ({ ...o, includeMetrics: checked === true }))
                }
              />
              <label
                htmlFor="pdf-metrics"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Métricas (total productos, total compras, último pedido)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pdf-products"
                checked={pdfOptions.includeProducts ?? true}
                onCheckedChange={(checked) =>
                  setPdfOptions((o) => ({ ...o, includeProducts: checked === true }))
                }
              />
              <label
                htmlFor="pdf-products"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Listado de productos que suministra
              </label>
            </div>
            {canViewMerchandise && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pdf-merchandise"
                  checked={pdfOptions.includeMerchandiseEntries ?? false}
                  onCheckedChange={(checked) =>
                    setPdfOptions((o) => ({ ...o, includeMerchandiseEntries: checked === true }))
                  }
                />
                <label
                  htmlFor="pdf-merchandise"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Entradas de mercancía (registros de ingreso asociados)
                </label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPdfOptionsOpen(false)} disabled={isGeneratingPdf}>
              Cancelar
            </Button>
            <Button
              className="border-liquor-amber bg-liquor-amber/10 text-liquor-amber hover:bg-liquor-amber/20"
              disabled={
                (!(pdfOptions.includeBasic ?? true) &&
                  !(pdfOptions.includeMetrics ?? true) &&
                  !(pdfOptions.includeProducts ?? true) &&
                  (!canViewMerchandise || !(pdfOptions.includeMerchandiseEntries ?? false))) ||
                isGeneratingPdf
              }
              onClick={async () => {
                setIsGeneratingPdf(true)
                try {
                  let merchEntries: SupplierPDFMerchandiseEntry[] | undefined
                  if (pdfOptions.includeMerchandiseEntries && canViewMerchandise && id) {
                    const data = await fetchIncomingMerchandise({
                      supplier_id: id,
                      pageSize: 100,
                      page: 1,
                    })
                    merchEntries = data.items.map((entry) => ({
                      date: entry.date,
                      registeredBy: entry.registeredBy,
                      itemsCount: entry.itemsCount,
                      totalValue: entry.totalValue,
                    }))
                  }
                  generateSupplierPDF(supplier, pdfOptions, merchEntries)
                  toast({
                    title: 'PDF Generado',
                    description: `Reporte del proveedor "${supplier.name}" descargado correctamente`,
                  })
                  setIsPdfOptionsOpen(false)
                } catch (e) {
                  toast({
                    title: 'Error',
                    description: (e as Error)?.message ?? 'No se pudo generar el PDF',
                    variant: 'destructive',
                  })
                } finally {
                  setIsGeneratingPdf(false)
                }
              }}
            >
              {isGeneratingPdf ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  Generando...
                </span>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  Generar PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="detalles" className="w-full">
        <TabsList className={canViewMerchandise ? 'grid w-full max-w-md grid-cols-2' : 'grid w-full max-w-md grid-cols-1'}>
          <TabsTrigger value="detalles">Detalles</TabsTrigger>
          {canViewMerchandise && (
            <TabsTrigger value="entradas">
              Entradas de mercancía
              {merchData?.totalItems != null && merchData.totalItems > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {merchData.totalItems}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="detalles" className="mt-6">
          <Card className={isEditing && canEditSupplier ? 'ring-2 ring-liquor-amber/30' : ''}>
            <CardContent className="pt-6 space-y-6">
              {isEditing && canEditSupplier && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (supplier) {
                          setEditName(supplier.name ?? '')
                          setEditContact(supplier.contact ?? '')
                          setEditPhone(supplier.phone ?? '')
                          setEditEmail(supplier.email ?? '')
                          setEditAddress(supplier.address ?? '')
                          setEditCategoryIds([])
                          setEditPaymentTermId(undefined)
                          setEditStatusId(undefined)
                        }
                        setIsEditing(false)
                      }}
                      disabled={isUpdating}
                    >
                      Cancelar cambios
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isUpdating}
                      className="bg-liquor-amber hover:bg-liquor-amber/90 text-white"
                    >
                      {isUpdating ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Datos de la empresa</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Nombre de la Empresa</Label>
                    {isEditing && canEditSupplier ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-foreground font-medium">{supplier.name}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Persona de Contacto</Label>
                    {isEditing && canEditSupplier ? (
                      <Input
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-foreground font-medium">{supplier.contact}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Teléfono</Label>
                    {isEditing && canEditSupplier ? (
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-foreground font-medium">{supplier.phone}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    {isEditing && canEditSupplier ? (
                      <Input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-foreground font-medium">{supplier.email}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Categorías</Label>
                    {isEditing && canEditSupplier ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between mt-1"
                          >
                            <span className="truncate text-left">
                              {editCategoryIds.length === 0
                                ? 'Seleccionar categorías'
                                : `${editCategoryIds.length} categoría(s) seleccionada(s)`}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar categoría..." />
                            <CommandList>
                              <CommandEmpty>Sin resultados.</CommandEmpty>
                              <CommandGroup>
                                <ScrollArea className="max-h-64">
                                  {categories.map((c) => {
                                    const idStr = String(c.id)
                                    const selected = editCategoryIds.includes(idStr)
                                    return (
                                      <CommandItem
                                        key={idStr}
                                        value={c.name}
                                        onSelect={() => {
                                          setEditCategoryIds((prev) =>
                                            prev.includes(idStr)
                                              ? prev.filter((v) => v !== idStr)
                                              : [...prev, idStr]
                                          )
                                        }}
                                      >
                                        <Check
                                          className={
                                            'mr-2 h-4 w-4 ' + (selected ? 'opacity-100' : 'opacity-0')
                                          }
                                        />
                                        {c.name}
                                      </CommandItem>
                                    )
                                  })}
                                  {categories.length === 0 && (
                                    <div className="px-2 py-3 text-xs text-muted-foreground">
                                      Configura categorías en catálogos primero.
                                    </div>
                                  )}
                                </ScrollArea>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <p className="text-foreground font-medium">
                        {supplier.categoriesLabel || String(supplier.category)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    {isEditing && canEditSupplier ? (
                      <Select
                        value={editStatusId}
                        onValueChange={(v) => setEditStatusId(v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={String(supplier.status)} />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.length > 0
                            ? statuses.map((s) => (
                                <SelectItem key={String(s.id)} value={String(s.id)}>
                                  {s.name}
                                </SelectItem>
                              ))
                            : [
                                <SelectItem key="active" value="1">
                                  Activo
                                </SelectItem>,
                                <SelectItem key="inactive" value="2">
                                  Inactivo
                                </SelectItem>,
                              ]}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1">{getStatusBadge(String(supplier.status))}</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Términos de Pago</Label>
                    {isEditing && canEditSupplier ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between mt-1"
                          >
                            <span className="truncate text-left">
                              {editPaymentTermId
                                ? paymentTerms.find((t: any) => String(t.id) === editPaymentTermId)?.name ??
                                  supplier.paymentTerms
                                : supplier.paymentTerms || 'Seleccionar término de pago'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[260px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar término de pago..." />
                            <CommandList>
                              <CommandEmpty>Sin resultados.</CommandEmpty>
                              <CommandGroup>
                                <ScrollArea className="max-h-64">
                                  {(paymentTerms.length > 0
                                    ? paymentTerms
                                    : [
                                        { id: 1, name: '7 días' },
                                        { id: 2, name: '15 días' },
                                        { id: 3, name: '30 días' },
                                        { id: 4, name: '45 días' },
                                      ]
                                  ).map((t: any) => {
                                    const idStr = String(t.id)
                                    const selected = editPaymentTermId === idStr
                                    return (
                                      <CommandItem
                                        key={idStr}
                                        value={t.name}
                                        onSelect={() => {
                                          setEditPaymentTermId(idStr)
                                        }}
                                      >
                                        <Check
                                          className={
                                            'mr-2 h-4 w-4 ' + (selected ? 'opacity-100' : 'opacity-0')
                                          }
                                        />
                                        {t.name}
                                      </CommandItem>
                                    )
                                  })}
                                </ScrollArea>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <p className="text-foreground font-medium">{supplier.paymentTerms}</p>
                    )}
                  </div>
                </div>
              </div>
              </div>

              <Separator />

              {!isEditing && (
                <div className="mt-6 space-y-3">
                  <Label className="text-lg font-medium">Productos que Suministra</Label>
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {supplier.productsList && supplier.productsList.length > 0 ? (
                      <div className="space-y-2 p-3">
                        {supplier.productsList.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded"
                          >
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Stock: {product.stock} unidades
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">
                                Q {Number(product.price).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        No hay productos asociados a este proveedor
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Dirección</p>
                {isEditing && canEditSupplier ? (
                  <Input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Dirección del proveedor"
                    className="mt-1"
                  />
                ) : (
                  <p className="text-foreground font-medium">{supplier.address || '—'}</p>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {supplier.productsList?.length ?? supplier.products}
                  </p>
                  <p className="text-sm text-muted-foreground">Productos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    Q {Number(supplier.totalPurchases).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Compras</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{supplier.lastOrder}</p>
                  <p className="text-sm text-muted-foreground">Último Pedido</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canViewMerchandise && (
        <TabsContent value="entradas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Entradas de mercancía</CardTitle>
              <p className="text-sm text-muted-foreground">
                Registros de ingreso de productos asociados a este proveedor
              </p>
            </CardHeader>
            <CardContent>
              {merchLoading ? (
                <div className="py-12 text-center text-muted-foreground">Cargando registros...</div>
              ) : records.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No hay entradas de mercancía para este proveedor</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-muted-foreground">Fecha</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Registrado por</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Productos</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                          {canDetails && (
                            <th className="text-center p-3 font-medium text-muted-foreground">Acciones</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((record) => (
                          <tr key={record.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 text-sm">{formatDate(record.date)}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>{record.registeredBy.name}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary">{record.itemsCount} productos</Badge>
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {formatCurrency(record.totalValue)}
                            </td>
                            {canDetails && (
                              <td className="p-3">
                                <div className="flex justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDetailRecordId(record.id)
                                      setIsDetailOpen(true)
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-4">
                      <Pagination
                        currentPage={merchPage}
                        totalPages={totalPages}
                        onPageChange={setMerchPage}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del registro de mercancía</DialogTitle>
          </DialogHeader>
          {detailData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Fecha</Label>
                  <p className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(detailData.date)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Registrado por</Label>
                  <p className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4" />
                    {detailData.registeredBy.name}
                  </p>
                </div>
              </div>
              {detailData.notes && (
                <div>
                  <Label className="text-muted-foreground">Notas</Label>
                  <p className="mt-1">{detailData.notes}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Productos</Label>
                <div className="border rounded-lg mt-2 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Producto</th>
                        <th className="text-right p-3 font-medium">Cantidad</th>
                        <th className="text-right p-3 font-medium">Costo unit.</th>
                        <th className="text-right p-3 font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="p-3">{item.product.name}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(item.unit_cost)}</td>
                          <td className="p-3 text-right">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-2">
                  <span className="font-semibold">Total: {formatCurrency(detailData.totalValue)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Cargando detalle...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
