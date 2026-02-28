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
 * ProductManagement - Refactored main component
 * 
 * This component orchestrates the product management feature.
 * Logic is extracted into custom hooks, UI into sub-components.
 */
import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
    Plus, Search, Filter, Trash2, Eye, ScanLine, Download, MoreVertical,
    QrCode, PackagePlus, ChevronLeft, ChevronRight, Upload, LayoutGrid, List, Package
} from 'lucide-react'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import type { Product } from '@/types'
import { useProducts } from '@/hooks/useProducts'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useCategories } from '@/hooks/useCategories'
import { useDeleteProduct } from '@/hooks/useDeleteProduct'
import { adaptApiProduct, fetchAllProducts } from '@/services/productService'
import { Pagination } from '@/components/shared/Pagination'

// Feature imports
import { ImportDialog } from './components'
import { useAuthPermissions } from '@/hooks/useAuthPermissions'
import { useNavigate } from 'react-router-dom'

const ProductManagement = () => {
    const navigate = useNavigate()
    const { toast } = useToast()
    const { hasPermission } = useAuthPermissions()

    // Filter state
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(18) // Default page size

    // Dialog states
    const [isViewProductOpen, setIsViewProductOpen] = useState(false)
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
    const EXPORT_COLUMNS: { id: string; label: string }[] = [
        { id: 'name', label: 'Nombre' },
        { id: 'category', label: 'Categoría' },
        { id: 'brand', label: 'Marca' },
        { id: 'size', label: 'Tamaño' },
        { id: 'barcode', label: 'Código de barras' },
        { id: 'price', label: 'Precio' },
        { id: 'cost', label: 'Costo' },
        { id: 'stock', label: 'Stock' },
        { id: 'min_stock', label: 'Stock mínimo' },
        { id: 'supplier', label: 'Proveedor' },
        { id: 'status', label: 'Estado' },
        { id: 'description', label: 'Descripción' },
    ]
    const [exportSelectedFields, setExportSelectedFields] = useState<string[]>(['name', 'category', 'brand', 'size', 'price', 'stock'])
    const [exportIncludeSummary, setExportIncludeSummary] = useState(true)

    // Selección para exportar (IDs de productos)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [selectingAllPages, setSelectingAllPages] = useState(false)

    // Selected product
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [scannedCode, setScannedCode] = useState('')

    // Data hooks
    const { data: productsData, isLoading, isError, refetch: refetchProducts } = useProducts({
        page: currentPage,
        pageSize: pageSize,
        search: searchTerm || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
    })
    const { data: suppliersData } = useSuppliers()
    const { data: categoriesData } = useCategories()
    const suppliers = useMemo(() => suppliersData?.items ?? [], [suppliersData])
    const products = useMemo(() => {
        if (!productsData?.items) return []
        return productsData.items.map(adaptApiProduct)
    }, [productsData])
    // Mutations
    const deleteMutation = useDeleteProduct()
    const { mutateAsync: deleteMutateAsync, isPending: deleteIsLoading } = deleteMutation

    // Categories list
    const categories = useMemo(() => {
        const base = ['all'] as string[]
        if (Array.isArray(categoriesData) && categoriesData.length) {
            return base.concat(categoriesData.map(c => String(c.name)))
        }
        return base.concat(['Whisky', 'Vinos', 'Cervezas', 'Rones', 'Vodkas', 'Tequilas', 'Ginebras'])
    }, [categoriesData])

    // Reset page on filter change
    useEffect(() => setCurrentPage(1), [searchTerm, categoryFilter, pageSize])

    // Products are already filtered and paginated by the backend
    const paginatedProducts = products
    const totalPages = productsData?.totalPages || 1
    const totalItems = productsData?.totalItems || 0

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
    const onPageIds = useMemo(() => paginatedProducts.map((p) => p.id), [paginatedProducts])
    const allOnPageSelected = onPageIds.length > 0 && onPageIds.every((id) => selectedSet.has(id))
    const someOnPageSelected = onPageIds.some((id) => selectedSet.has(id))

    const toggleSelection = (id: string) => {
        setSelectedIds((prev) => (selectedSet.has(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    }
    const toggleSelectAllOnPage = () => {
        if (allOnPageSelected) setSelectedIds((prev) => prev.filter((id) => !onPageIds.includes(id)))
        else setSelectedIds((prev) => [...new Set([...prev, ...onPageIds])])
    }
    const handleSelectAllPages = async () => {
        setSelectingAllPages(true)
        try {
            const all = await fetchAllProducts()
            setSelectedIds(all.map((p) => p.id))
            toast({ title: 'Seleccionados', description: `${all.length} productos de todas las páginas` })
        } catch {
            toast({ title: 'Error', description: 'No se pudo cargar la lista completa', variant: 'destructive' })
        } finally {
            setSelectingAllPages(false)
        }
    }

    // Permisos
    const canImport = hasPermission('products.import')
    const canExport = canImport && hasPermission('products.view', 'reports.view')
    const canCreate = hasPermission('products.create')
    const canEdit = hasPermission('products.edit')
    const canDelete = hasPermission('products.delete')
    const canRegisterIncoming = hasPermission('products.register_incoming')

    // Export handler: pass selected fields for table PDF, or none for full card layout. If selectedIds.length > 0, only those products are exported.
    const handleExport = async (fields?: string[], ids?: string[], includeSummary?: boolean) => {
        if (!canExport) return
        try {
            const svc = await import('@/services/productService')
            await svc.exportProductsPdf({
                ...(fields?.length ? { fields } : {}),
                ...(ids?.length ? { ids } : {}),
                ...(includeSummary === false ? { includeSummary: false } : {}),
            })
            setIsExportDialogOpen(false)
            toast({ title: 'Exportado', description: 'El reporte PDF se descargó correctamente' })
        } catch (err: unknown) {
            const message = (err as { message?: string })?.message || 'No se pudo descargar el reporte'
            toast({ title: 'Error', description: message, variant: 'destructive' })
        }
    }

    // Status badge helper
    const getStatusBadge = (product: Product) => {
        if (product.stock === 0 || product.status === 'out_of_stock') {
            return <Badge variant="destructive">Sin Stock</Badge>
        } else if (product.stock <= product.minStock || product.status === 'low_stock') {
            return <Badge className="bg-liquor-amber text-liquor-bronze">Stock Bajo</Badge>
        }
        return <Badge className="bg-liquor-gold text-liquor-bronze">Disponible</Badge>
    }

    // CRUD handlers
    const handleDeleteProduct = async () => {
        if (!deleteTargetId) return
        try {
            await deleteMutateAsync(deleteTargetId)
            setIsDeleteDialogOpen(false)
            setDeleteTargetId(null)
            toast({ title: 'Producto eliminado', description: 'El producto fue eliminado correctamente' })
            // Ajustar página si es necesario
            const result = await refetchProducts()
            if (result.data && result.data.items.length === 0 && result.data.page > 1) {
                setCurrentPage(result.data.page - 1)
            }
        } catch (err: unknown) {
            const message = (err as { message?: string })?.message || 'No se pudo eliminar el producto'
            toast({ title: 'Error', description: message, variant: 'destructive' })
        }
    }


    // View/Edit handlers
    const viewProduct = (product: Product) => {
        navigate(`/inventario/${product.id}`)
    }

    const searchByBarcode = () => {
        if (!scannedCode) return
        const product = products.find(p => p.barcode === scannedCode)
        if (product) {
            viewProduct(product)
            setIsScannerOpen(false)
            setScannedCode('')
        } else {
            toast({ title: 'Producto No Encontrado', description: 'No se encontró un producto con ese código', variant: 'destructive' })
        }
    }

    return (
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-2xl font-bold text-foreground">Inventario</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Administra tu catálogo</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible">
                    {canExport && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                                if (selectedIds.length > 0 && viewMode === 'cards') setExportSelectedFields([])
                                setIsExportDialogOpen(true)
                            }}
                        >
                            <Download className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Exportar</span>
                        </Button>
                    )}
                    {canImport && (
                        <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} size="sm" className="shrink-0">
                            <Upload className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Importar</span>
                        </Button>
                    )}
                    {canRegisterIncoming && (
                        <Button
                            variant="outline"
                            onClick={() => navigate('/inventario/registrar-ingreso')}
                            size="sm"
                            className="shrink-0"
                        >
                            <Package className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Registrar Ingreso</span>
                        </Button>
                    )}
                    <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="shrink-0"><ScanLine className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Escanear</span></Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader><DialogTitle>Escáner de Códigos</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <div className="text-center">
                                    <QrCode className="w-24 h-24 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">Ingrese el código de barras manualmente</p>
                                </div>
                                <div>
                                    <Label htmlFor="scannedCode">Código de Barras</Label>
                                    <Input
                                        id="scannedCode"
                                        placeholder="7501001234567"
                                        value={scannedCode}
                                        onChange={e => setScannedCode(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && searchByBarcode()}
                                    />
                                </div>
                                <div className="flex space-x-2">
                                    <Button variant="outline" className="flex-1" onClick={() => setIsScannerOpen(false)}>Cancelar</Button>
                                    <Button className="flex-1" onClick={searchByBarcode}>Buscar</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    {canCreate && (
                        <Button size="sm" className="shrink-0" onClick={() => navigate('/inventario/nuevo')}>
                            <Plus className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Nuevo Producto</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, marca o código..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-48">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(category => (
                                    <SelectItem key={category} value={category}>
                                        {category === 'all' ? 'Todas las categorías' : category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Products View (table or cards) */}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle>Productos ({totalItems})</CardTitle>
                    {/* View mode toggle (solo iconos, igual que /mercancia) */}
                    <div className="flex items-center border rounded-md bg-background/80">
                        <Button
                            type="button"
                            variant={viewMode === 'table' ? 'default' : 'ghost'}
                            size="icon"
                            className="h-8 w-8 rounded-r-none"
                            onClick={() => setViewMode('table')}
                            aria-label="Vista de tabla"
                        >
                            <List className="w-4 h-4" />
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === 'cards' ? 'default' : 'ghost'}
                            size="icon"
                            className="h-8 w-8 rounded-l-none"
                            onClick={() => { setViewMode('cards'); setSelectedIds([]) }}
                            aria-label="Vista de cuadros"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading && <div className="p-6 text-muted-foreground">Cargando productos...</div>}
                    {isError && !isLoading && <div className="p-6 text-destructive">Error al cargar productos.</div>}
                    {!isLoading && !isError && (
                        <div className="space-y-4">
                            {viewMode === 'table' && selectedIds.length > 0 && (
                                <div className="flex flex-wrap items-center gap-3 py-2 px-3 rounded-md bg-muted/60 border border-border">
                                    <span className="text-sm font-medium text-foreground">{selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}</span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSelectAllPages}
                                        disabled={selectingAllPages}
                                    >
                                        {selectingAllPages ? 'Cargando...' : 'Seleccionar todos (todas las páginas)'}
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                                        Limpiar selección
                                    </Button>
                                </div>
                            )}
                            {paginatedProducts.length === 0 ? (
                                <div className="p-6 text-center text-muted-foreground">
                                    No hay productos para mostrar.
                                </div>
                            ) : viewMode === 'table' ? (
                                // Vista de lista (tabla)
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="w-10 p-3 text-left">
                                                    <Checkbox
                                                        checked={allOnPageSelected}
                                                        onCheckedChange={toggleSelectAllOnPage}
                                                        aria-label="Seleccionar todos de esta página"
                                                    />
                                                </th>
                                                <th className="text-left p-3 font-medium text-muted-foreground">Producto</th>
                                                <th className="text-left p-3 font-medium text-muted-foreground">Categoría</th>
                                                <th className="text-center p-3 font-medium text-muted-foreground">Stock</th>
                                                <th className="text-right p-3 font-medium text-muted-foreground">Precio</th>
                                                <th className="text-center p-3 font-medium text-muted-foreground">Estado</th>
                                                <th className="text-center p-3 font-medium text-muted-foreground">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedProducts.map((product, index) => (
                                                <tr key={product.id} className="border-b border-border hover:bg-muted transition-colors animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                                                    <td className="p-3 w-10">
                                                        <Checkbox
                                                            checked={selectedSet.has(product.id)}
                                                            onCheckedChange={() => toggleSelection(product.id)}
                                                            aria-label={`Seleccionar ${product.name}`}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="font-medium text-foreground">{product.name}</div>
                                                        <div className="text-sm text-muted-foreground">{product.brand} • {product.size}</div>
                                                        <div className="text-xs text-muted-foreground">Código: {product.id}</div>
                                                    </td>
                                                    <td className="p-3"><Badge variant="outline">{String(product.category)}</Badge></td>
                                                    <td className="p-3 text-center">
                                                        <div className="font-medium text-foreground">{product.stock}</div>
                                                        <div className="text-xs text-muted-foreground">Min: {product.minStock}</div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="font-medium text-foreground">Q {product.price.toFixed(2)}</div>
                                                        {canCreate && (
                                                            <div className="text-xs text-muted-foreground">Costo: Q {product.cost.toFixed(2)}</div>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">{getStatusBadge(product)}</td>
                                                    <td className="p-3 text-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-popover border-border">
                                                                <DropdownMenuItem onClick={() => viewProduct(product)}><Eye className="w-4 h-4 mr-2" />Ver Detalles</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => viewProduct(product)}><ScanLine className="w-4 h-4 mr-2" />Ver Código</DropdownMenuItem>
                                                                {canDelete && (
                                                                    <DropdownMenuItem
                                                                        className="text-destructive"
                                                                        onClick={() => { setDeleteTargetId(product.id); setIsDeleteDialogOpen(true) }}
                                                                    >
                                                                        <Trash2 className="w-4 h-4 mr-2" />Eliminar
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                // Vista de cuadros (cards) — sin selección
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {paginatedProducts.map((product, index) => (
                                        <div
                                            key={product.id}
                                            className="border border-border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-shadow animate-slide-up"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center border border-border">
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground text-center px-1">
                                                            Sin imagen
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
                                                        {getStatusBadge(product)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {product.brand} • {product.size}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Categoría: <span className="font-medium">{String(product.category)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between text-sm">
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Precio</div>
                                                    <div className="font-semibold text-primary">Q {product.price.toFixed(2)}</div>
                                                    {canCreate && (
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Costo: Q {product.cost.toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-muted-foreground">Stock</div>
                                                    <div className="font-semibold">{product.stock}</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        Min: {product.minStock}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Button size="sm" variant="outline" onClick={() => viewProduct(product)}>
                                                    <Eye className="w-3 h-3 mr-1" /> Detalles
                                                </Button>
                                                {canDelete && (
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => { setDeleteTargetId(product.id); setIsDeleteDialogOpen(true) }}
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination + page size */}
                            <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
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
                                            {[18, 27, 36].map((n) => (
                                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {productsData && productsData.totalPages > 1 && (
                                    <Pagination
                                        currentPage={productsData.page}
                                        totalPages={productsData.totalPages}
                                        onPageChange={setCurrentPage}
                                        hasNextPage={productsData.nextPage !== null}
                                        hasPrevPage={productsData.prevPage !== null}
                                        loading={isLoading}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Producto?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente el producto seleccionado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setDeleteTargetId(null); setIsDeleteDialogOpen(false) }} disabled={deleteIsLoading}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteIsLoading}
                            onClick={handleDeleteProduct}
                        >
                            {deleteIsLoading ? 'Eliminando...' : 'Eliminar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Import Dialog */}
            <ImportDialog
                open={isImportDialogOpen}
                onOpenChange={setIsImportDialogOpen}
                onImportSuccess={() => {
                    // Trigger refetch by invalidating query
                    window.location.reload()
                }}
            />

            {/* Export PDF Dialog - choose columns for report / cotización */}
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Exportar inventario</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            Elige qué información incluir en el PDF (útil para cotizaciones o listados personalizados).
                        </p>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex flex-wrap gap-4">
                            {EXPORT_COLUMNS.map((col) => (
                                <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                        checked={exportSelectedFields.includes(col.id)}
                                        onCheckedChange={(checked) => {
                                            setExportSelectedFields((prev) =>
                                                checked ? [...prev, col.id] : prev.filter((f) => f !== col.id)
                                            )
                                        }}
                                    />
                                    <span className="text-sm">{col.label}</span>
                                </label>
                            ))}
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer pt-2">
                            <Checkbox
                                checked={exportIncludeSummary}
                                onCheckedChange={(checked) => setExportIncludeSummary(checked === true)}
                            />
                            <span className="text-sm">Incluir resumen (productos registrados, unidades, valor del inventario)</span>
                        </label>
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setExportSelectedFields(['name', 'category', 'brand', 'size', 'price', 'stock'])}
                            >
                                Solo cotización
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setExportSelectedFields(EXPORT_COLUMNS.map((c) => c.id))}
                            >
                                Seleccionar todo
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExport(undefined, selectedIds.length ? selectedIds : undefined, exportIncludeSummary)}
                            >
                                Vista de tarjetas (completa)
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="ml-auto bg-liquor-amber hover:bg-liquor-amber/90 text-white"
                                onClick={() => {
                                    const idsToExport = selectedIds.length ? selectedIds : undefined
                                    if (exportSelectedFields.length === 0) {
                                        handleExport(undefined, idsToExport, exportIncludeSummary)
                                    } else {
                                        handleExport(exportSelectedFields, idsToExport, exportIncludeSummary)
                                    }
                                }}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Generar PDF
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default ProductManagement
