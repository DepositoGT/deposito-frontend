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
    Plus, Search, Filter, Edit, Trash2, Eye, ScanLine, Download, MoreVertical,
    QrCode, PackagePlus, ChevronLeft, ChevronRight, Upload
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
import { useToast } from '@/hooks/use-toast'
import type { Product } from '@/types'
import { useProducts } from '@/hooks/useProducts'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useCategories } from '@/hooks/useCategories'
import { useCreateProduct } from '@/hooks/useCreateProduct'
import { useDeleteProduct } from '@/hooks/useDeleteProduct'
import useUpdateProduct from '@/hooks/useUpdateProduct'
import useAdjustStock from '@/hooks/useAdjustStock'

// Feature imports
import { useProductForm } from './hooks'
import { ProductFormDialog, StockAdjustDialog, ProductDetailDialog, ImportDialog } from './components'
import type { StockAdjustment } from './types'

const ProductManagement = () => {
    const { toast } = useToast()

    // Data hooks
    const { data: productsData, isLoading, isError } = useProducts()
    const { data: suppliersData } = useSuppliers()
    const { data: categoriesData } = useCategories()
    const suppliers = useMemo(() => suppliersData ?? [], [suppliersData])
    const products = useMemo(() => productsData ?? [], [productsData])
    const normalizedCategories = useMemo(() =>
        (categoriesData ?? []).map(c => ({ id: String(c.id), name: String(c.name) })),
        [categoriesData]
    )

    // Mutations
    const createProductMutation = useCreateProduct()
    const updateMutation = useUpdateProduct()
    const deleteMutation = useDeleteProduct()
    const adjustStockMutation = useAdjustStock()
    const { mutateAsync: deleteMutateAsync, isPending: deleteIsLoading } = deleteMutation

    // Form hook
    const productForm = useProductForm()

    // Filter state
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')

    // Dialog states
    const [isNewProductOpen, setIsNewProductOpen] = useState(false)
    const [isViewProductOpen, setIsViewProductOpen] = useState(false)
    const [isEditProductOpen, setIsEditProductOpen] = useState(false)
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

    // Selected product
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [scannedCode, setScannedCode] = useState('')
    const [stockAdjustment, setStockAdjustment] = useState<StockAdjustment>({
        amount: '', reason: '', type: 'add'
    })

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(5)

    // Categories list
    const categories = useMemo(() => {
        const base = ['all'] as string[]
        if (Array.isArray(categoriesData) && categoriesData.length) {
            return base.concat(categoriesData.map(c => String(c.name)))
        }
        if (products.length) {
            const set = new Set<string>()
            products.forEach(p => { if (p.category) set.add(String(p.category)) })
            return base.concat(Array.from(set))
        }
        return base.concat(['Whisky', 'Vinos', 'Cervezas', 'Rones', 'Vodkas', 'Tequilas', 'Ginebras'])
    }, [categoriesData, products])

    // Reset page on filter change
    useEffect(() => setCurrentPage(1), [searchTerm, categoryFilter, productsData])

    // Filtered products
    const filteredProducts = useMemo(() => {
        const term = searchTerm.toLowerCase()
        return products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(term) ||
                (product.brand || '').toLowerCase().includes(term) ||
                (product.barcode || '').includes(searchTerm)
            const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
            return matchesSearch && matchesCategory
        })
    }, [products, searchTerm, categoryFilter])

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
    const paginatedProducts = useMemo(() => {
        const page = Math.min(currentPage, totalPages)
        const start = (page - 1) * pageSize
        return filteredProducts.slice(start, start + pageSize)
    }, [filteredProducts, currentPage, pageSize, totalPages])

    // Export handler
    const handleExport = async () => {
        try {
            const svc = await import('@/services/productService')
            await svc.exportProductsPdf()
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
    const handleSaveProduct = () => {
        if (!productForm.validateForm()) return

        const payload = {
            name: productForm.formData.name.trim(),
            category_id: Number(productForm.formData.category),
            brand: productForm.formData.brand?.trim() || undefined,
            size: productForm.formData.size?.trim() || undefined,
            stock: productForm.formData.stock ? Number(productForm.formData.stock) : 0,
            min_stock: productForm.formData.minStock ? Number(productForm.formData.minStock) : 0,
            price: Number(productForm.formData.price),
            cost: productForm.formData.cost ? Number(productForm.formData.cost) : 0,
            supplier_id: productForm.formData.supplier,
            barcode: productForm.formData.barcode?.trim() || undefined,
            description: productForm.formData.description?.trim() || undefined,
            status_id: 1
        }

        createProductMutation.mutate(payload, {
            onSuccess: () => {
                toast({ title: 'Producto creado', description: 'El producto fue creado correctamente' })
                productForm.resetForm()
                setIsNewProductOpen(false)
            },
            onError: (err: unknown) => {
                const message = (err as { message?: string })?.message || 'No se pudo crear el producto'
                toast({ title: 'Error', description: message, variant: 'destructive' })
            }
        })
    }

    const handleUpdateProduct = async () => {
        if (!selectedProduct || !productForm.validateForm()) return

        try {
            const payload = {
                id: selectedProduct.id,
                name: productForm.formData.name.trim(),
                category_id: Number(productForm.formData.category),
                brand: productForm.formData.brand?.trim() || undefined,
                size: productForm.formData.size?.trim() || undefined,
                stock: productForm.formData.stock ? Number(productForm.formData.stock) : 0,
                min_stock: productForm.formData.minStock ? Number(productForm.formData.minStock) : 0,
                price: Number(productForm.formData.price),
                cost: productForm.formData.cost ? Number(productForm.formData.cost) : 0,
                supplier_id: productForm.formData.supplier,
                barcode: productForm.formData.barcode?.trim() || undefined,
                description: productForm.formData.description?.trim() || undefined,
                status_id: 1
            }

            await updateMutation.mutateAsync({ id: selectedProduct.id, payload })
            toast({ title: 'Producto actualizado', description: 'El producto fue actualizado correctamente' })
            productForm.resetForm()
            setIsEditProductOpen(false)
            setSelectedProduct(null)
        } catch (err: unknown) {
            const message = (err as { message?: string })?.message || 'No se pudo actualizar el producto'
            toast({ title: 'Error', description: message, variant: 'destructive' })
        }
    }

    const handleDeleteProduct = async () => {
        if (!deleteTargetId) return
        try {
            await deleteMutateAsync(deleteTargetId)
            setIsDeleteDialogOpen(false)
            setDeleteTargetId(null)
            toast({ title: 'Producto eliminado', description: 'El producto fue eliminado correctamente' })
        } catch (err: unknown) {
            const message = (err as { message?: string })?.message || 'No se pudo eliminar el producto'
            toast({ title: 'Error', description: message, variant: 'destructive' })
        }
    }

    const handleAdjustStock = () => {
        if (!selectedProduct || !stockAdjustment.amount || !stockAdjustment.reason) {
            toast({ title: 'Error', description: 'Complete todos los campos', variant: 'destructive' })
            return
        }

        const payload: { type: 'add' | 'remove'; amount: number; reason: string; supplier_id?: string; cost?: number } = {
            type: stockAdjustment.type,
            amount: parseInt(stockAdjustment.amount),
            reason: stockAdjustment.reason
        }

        if (stockAdjustment.type === 'add') {
            if (productForm.formData.supplier) payload.supplier_id = productForm.formData.supplier
            if (productForm.formData.cost) payload.cost = Number(productForm.formData.cost) || undefined
        }

        adjustStockMutation.mutate({ id: selectedProduct.id, payload }, {
            onSuccess: () => {
                toast({ title: 'Ajuste realizado', description: 'El stock fue ajustado correctamente' })
                setIsStockAdjustOpen(false)
                setStockAdjustment({ amount: '', reason: '', type: 'add' })
            },
            onError: (err: unknown) => {
                const message = (err as { message?: string })?.message || 'No se pudo ajustar el stock'
                toast({ title: 'Error', description: message, variant: 'destructive' })
            }
        })
    }

    // View/Edit handlers
    const viewProduct = (product: Product) => {
        setSelectedProduct(product)
        setIsViewProductOpen(true)
    }

    const editProduct = (product: Product) => {
        setSelectedProduct(product)
        productForm.populateFromProduct(product, suppliers, normalizedCategories)
        setIsEditProductOpen(true)
    }

    const openStockAdjust = (product: Product) => {
        setSelectedProduct(product)
        setStockAdjustment({ amount: '', reason: '', type: 'add' })
        setIsStockAdjustOpen(true)
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
                    <Button variant="outline" onClick={handleExport} size="sm" className="shrink-0">
                        <Download className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Exportar</span>
                    </Button>
                    <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} size="sm" className="shrink-0">
                        <Upload className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Importar</span>
                    </Button>
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
                    <Dialog open={isNewProductOpen} onOpenChange={setIsNewProductOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="shrink-0"><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Nuevo Producto</span></Button>
                        </DialogTrigger>
                    </Dialog>
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

            {/* Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Productos ({filteredProducts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && <div className="p-6 text-muted-foreground">Cargando productos...</div>}
                    {isError && !isLoading && <div className="p-6 text-destructive">Error al cargar productos.</div>}
                    {!isLoading && !isError && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left p-3 font-medium text-muted-foreground">Producto</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Categoría</th>
                                        <th className="text-center p-3 font-medium text-muted-foreground">Stock</th>
                                        <th className="text-right p-3 font-medium text-muted-foreground">Precio</th>
                                        <th className="text-center p-3 font-medium text-muted-foreground">Estado</th>
                                        <th className="text-center p-3 font-medium text-muted-foreground">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedProducts.length === 0 ? (
                                        <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No hay productos para mostrar.</td></tr>
                                    ) : paginatedProducts.map((product, index) => (
                                        <tr key={product.id} className="border-b border-border hover:bg-muted transition-colors animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
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
                                                <div className="text-xs text-muted-foreground">Costo: Q {product.cost.toFixed(2)}</div>
                                            </td>
                                            <td className="p-3 text-center">{getStatusBadge(product)}</td>
                                            <td className="p-3 text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-popover border-border">
                                                        <DropdownMenuItem onClick={() => viewProduct(product)}><Eye className="w-4 h-4 mr-2" />Ver Detalles</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => editProduct(product)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openStockAdjust(product)}><PackagePlus className="w-4 h-4 mr-2" />Ajustar Stock</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => viewProduct(product)}><ScanLine className="w-4 h-4 mr-2" />Ver Código</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteTargetId(product.id); setIsDeleteDialogOpen(true) }}>
                                                            <Trash2 className="w-4 h-4 mr-2" />Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4">
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <span>Mostrar</span>
                                    <select
                                        value={pageSize}
                                        onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                                        className="border rounded px-2 py-1 bg-background text-foreground"
                                    >
                                        {[5, 10, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <span>de {filteredProducts.length} productos</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        className="p-2 rounded border bg-background hover:bg-muted disabled:opacity-50"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-2 text-sm">Página {currentPage} de {totalPages}</span>
                                    <button
                                        className="p-2 rounded border bg-background hover:bg-muted disabled:opacity-50"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage >= totalPages}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialogs */}
            <ProductFormDialog
                open={isNewProductOpen}
                onOpenChange={setIsNewProductOpen}
                title="Nuevo Producto"
                formData={productForm.formData}
                onFormChange={(field, value) => productForm.setFormData(prev => ({ ...prev, [field]: value }))}
                onSubmit={handleSaveProduct}
                onGenerateBarcode={productForm.generateBarcode}
                categories={normalizedCategories.length > 0 ? normalizedCategories : categories.filter(c => c !== 'all')}
                suppliers={suppliers}
                isLoading={createProductMutation.isPending}
                submitLabel="Guardar Producto"
            />

            <ProductFormDialog
                open={isEditProductOpen}
                onOpenChange={setIsEditProductOpen}
                title="Editar Producto"
                formData={productForm.formData}
                onFormChange={(field, value) => productForm.setFormData(prev => ({ ...prev, [field]: value }))}
                onSubmit={handleUpdateProduct}
                onGenerateBarcode={productForm.generateBarcode}
                categories={normalizedCategories.length > 0 ? normalizedCategories : categories.filter(c => c !== 'all')}
                suppliers={suppliers}
                isLoading={updateMutation.isPending}
                submitLabel="Actualizar Producto"
            />

            <ProductDetailDialog
                open={isViewProductOpen}
                onOpenChange={setIsViewProductOpen}
                product={selectedProduct}
            />

            <StockAdjustDialog
                open={isStockAdjustOpen}
                onOpenChange={setIsStockAdjustOpen}
                product={selectedProduct}
                adjustment={stockAdjustment}
                onAdjustmentChange={(field, value) => setStockAdjustment(prev => ({ ...prev, [field]: value }))}
                onConfirm={handleAdjustStock}
                isLoading={adjustStockMutation.isPending}
            />

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
        </div>
    )
}

export default ProductManagement
