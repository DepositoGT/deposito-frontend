/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Badge } from './ui/badge'
import { useToast } from '../hooks/use-toast'
import {
  usePaymentTerms,
  useCreatePaymentTerm,
  useUpdatePaymentTerm,
  useDeletePaymentTerm,
  useRestorePaymentTerm,
  PaymentTerm,
} from '../hooks/usePaymentTerms'
import {
  useProductCategories,
  useCreateProductCategory,
  useUpdateProductCategory,
  useDeleteProductCategory,
  useRestoreProductCategory,
  ProductCategory,
} from '../hooks/useProductCategories'
import { useProducts, useRestoreProduct } from '../hooks/useProducts'
import { adaptApiProduct } from '../services/productService'
import type { Product } from '../types'
import { Pencil, Trash2, Plus, RotateCcw, Loader2, FileUp } from 'lucide-react'
import { CatalogImportDialog } from './catalogs/CatalogImportDialog'
import { Pagination } from './shared/Pagination'
import { useAuthPermissions } from '../hooks/useAuthPermissions'

// Tipos para los diálogos
type PaymentTermDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  item?: PaymentTerm
}

type ProductCategoryDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  item?: ProductCategory
}

export function CatalogsManagement() {
  const [activeTab, setActiveTab] = useState('payment-terms')
  const [showDeleted, setShowDeleted] = useState(false)

  // Payment Terms Dialog State
  const [paymentTermDialog, setPaymentTermDialog] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    item?: PaymentTerm
  }>({ open: false, mode: 'create' })

  // Product Categories Dialog State
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    item?: ProductCategory
  }>({ open: false, mode: 'create' })

  // Import Dialog State
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importType, setImportType] = useState<'categories' | 'payment-terms'>('categories')

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Catálogos</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Gestiona pagos y categorías</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-3">
            <TabsTrigger value="payment-terms" className="text-xs sm:text-sm whitespace-nowrap">Términos de Pago</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm whitespace-nowrap">Categorías</TabsTrigger>
            <TabsTrigger value="deleted-products" className="text-xs sm:text-sm whitespace-nowrap">Eliminados</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="payment-terms" className="space-y-4">
          <PaymentTermsTab
            showDeleted={showDeleted}
            setShowDeleted={setShowDeleted}
            dialog={paymentTermDialog}
            setDialog={setPaymentTermDialog}
            onImportClick={() => {
              setImportType('payment-terms')
              setIsImportDialogOpen(true)
            }}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <ProductCategoriesTab
            showDeleted={showDeleted}
            setShowDeleted={setShowDeleted}
            dialog={categoryDialog}
            setDialog={setCategoryDialog}
            onImportClick={() => {
              setImportType('categories')
              setIsImportDialogOpen(true)
            }}
          />
        </TabsContent>

        <TabsContent value="deleted-products" className="space-y-4">
          <DeletedProductsTab />
        </TabsContent>
      </Tabs>

      {/* Payment Terms Dialog */}
      <PaymentTermDialog
        dialog={paymentTermDialog}
        setDialog={setPaymentTermDialog}
      />

      {/* Product Categories Dialog */}
      <ProductCategoryDialog
        dialog={categoryDialog}
        setDialog={setCategoryDialog}
      />

      {/* Import Dialog */}
      <CatalogImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        type={importType}
      />
    </div>
  )
}

// Payment Terms Tab Component
function PaymentTermsTab({
  showDeleted,
  setShowDeleted,
  dialog,
  setDialog,
  onImportClick,
}: {
  showDeleted: boolean
  setShowDeleted: (value: boolean) => void
  dialog: PaymentTermDialogState
  setDialog: (value: PaymentTermDialogState) => void
  onImportClick: () => void
}) {
  const { toast } = useToast()
  const { hasPermission } = useAuthPermissions()
  const canManageCatalogs = hasPermission('catalogs.manage')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  
  const { data: paymentTermsData, isLoading } = usePaymentTerms({
    page: currentPage,
    pageSize,
    includeDeleted: showDeleted,
  })
  const paymentTerms = paymentTermsData?.items || []
  
  // Debug: verificar datos de paginación
  console.log('PaymentTermsData:', paymentTermsData)
  const deleteMutation = useDeletePaymentTerm()
  const restoreMutation = useRestorePaymentTerm()
  
  // Reset page when showDeleted changes
  useEffect(() => {
    setCurrentPage(1)
  }, [showDeleted])

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este término de pago?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast({
        title: 'Término eliminado',
        description: 'El término de pago ha sido eliminado correctamente',
      })
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: apiError.response?.data?.message || 'No se pudo eliminar el término de pago',
      })
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await restoreMutation.mutateAsync(id)
      toast({
        title: 'Término restaurado',
        description: 'El término de pago ha sido restaurado correctamente',
      })
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo restaurar el término de pago',
      })
    }
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <CardTitle className="text-lg sm:text-xl">Términos de Pago</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Administra los términos disponibles</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleted(!showDeleted)}
              className="text-xs sm:text-sm"
            >
              {showDeleted ? 'Ocultar' : 'Ver eliminados'}
            </Button>
            {canManageCatalogs && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onImportClick}
                  className="text-xs sm:text-sm"
                >
                  <FileUp className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setDialog({ open: true, mode: 'create' })}
                  className="text-xs sm:text-sm"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Nuevo</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Proveedores</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentTerms?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay términos de pago registrados
                  </TableCell>
                </TableRow>
              ) : (
                paymentTerms?.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium">{term.id}</TableCell>
                    <TableCell>{term.name}</TableCell>
                    <TableCell>{term._count?.suppliers || 0}</TableCell>
                    <TableCell>
                      {term.deleted ? (
                        <Badge variant="destructive">Eliminado</Badge>
                      ) : (
                        <Badge variant="default">Activo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageCatalogs && (
                        <div className="flex justify-end gap-2">
                          {term.deleted ? (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRestore(term.id)}
                              disabled={restoreMutation.isPending}
                            >
                              {restoreMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setDialog({ open: true, mode: 'edit', item: term })}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDelete(term.id)}
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        {paymentTermsData && paymentTermsData.totalPages > 0 && paymentTermsData.totalItems > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={paymentTermsData.page}
              totalPages={paymentTermsData.totalPages}
              onPageChange={setCurrentPage}
              hasNextPage={paymentTermsData.nextPage !== null}
              hasPrevPage={paymentTermsData.prevPage !== null}
              loading={isLoading}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Product Categories Tab Component
function ProductCategoriesTab({
  showDeleted,
  setShowDeleted,
  dialog,
  setDialog,
  onImportClick,
}: {
  showDeleted: boolean
  setShowDeleted: (value: boolean) => void
  dialog: ProductCategoryDialogState
  setDialog: (value: ProductCategoryDialogState) => void
  onImportClick: () => void
}) {
  const { toast } = useToast()
  const { hasPermission } = useAuthPermissions()
  const canManageCatalogs = hasPermission('catalogs.manage')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  
  const { data: categoriesData, isLoading } = useProductCategories({
    page: currentPage,
    pageSize,
    includeDeleted: showDeleted,
  })
  const categories = categoriesData?.items || []
  
  // Debug: verificar datos de paginación
  console.log('CategoriesData:', categoriesData)
  const deleteMutation = useDeleteProductCategory()
  const restoreMutation = useRestoreProductCategory()
  
  // Reset page when showDeleted changes
  useEffect(() => {
    setCurrentPage(1)
  }, [showDeleted])

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast({
        title: 'Categoría eliminada',
        description: 'La categoría ha sido eliminada correctamente',
      })
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: apiError.response?.data?.message || 'No se pudo eliminar la categoría',
      })
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await restoreMutation.mutateAsync(id)
      toast({
        title: 'Categoría restaurada',
        description: 'La categoría ha sido restaurada correctamente',
      })
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo restaurar la categoría',
      })
    }
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <CardTitle className="text-lg sm:text-xl">Categorías</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Administra las categorías disponibles</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleted(!showDeleted)}
              className="text-xs sm:text-sm"
            >
              {showDeleted ? 'Ocultar' : 'Ver eliminados'}
            </Button>
            {canManageCatalogs && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onImportClick}
                  className="text-xs sm:text-sm"
                >
                  <FileUp className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setDialog({ open: true, mode: 'create' })}
                  className="text-xs sm:text-sm"
                >
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Nueva</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Proveedores</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay categorías registradas
                  </TableCell>
                </TableRow>
              ) : (
                categories?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.id}</TableCell>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>{category._count?.products || 0}</TableCell>
                    <TableCell>{category._count?.suppliers || 0}</TableCell>
                    <TableCell>
                      {category.deleted ? (
                        <Badge variant="destructive">Eliminado</Badge>
                      ) : (
                        <Badge variant="default">Activo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageCatalogs && (
                        <div className="flex justify-end gap-2">
                          {category.deleted ? (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRestore(category.id)}
                              disabled={restoreMutation.isPending}
                            >
                              {restoreMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setDialog({ open: true, mode: 'edit', item: category })}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDelete(category.id)}
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        {categoriesData && categoriesData.totalPages > 0 && categoriesData.totalItems > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={categoriesData.page}
              totalPages={categoriesData.totalPages}
              onPageChange={setCurrentPage}
              hasNextPage={categoriesData.nextPage !== null}
              hasPrevPage={categoriesData.prevPage !== null}
              loading={isLoading}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Payment Term Dialog Component
function PaymentTermDialog({
  dialog,
  setDialog,
}: {
  dialog: PaymentTermDialogState
  setDialog: (value: PaymentTermDialogState) => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const createMutation = useCreatePaymentTerm()
  const updateMutation = useUpdatePaymentTerm()

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('')
      setDialog({ open: false, mode: 'create' })
    } else {
      if (dialog.item) {
        setName(dialog.item.name)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El nombre es requerido',
      })
      return
    }

    try {
      if (dialog.mode === 'create') {
        await createMutation.mutateAsync({ name: name.trim() })
        toast({
          title: 'Término creado',
          description: 'El término de pago ha sido creado correctamente',
        })
      } else if (dialog.item) {
        await updateMutation.mutateAsync({ id: dialog.item.id, data: { name: name.trim() } })
        toast({
          title: 'Término actualizado',
          description: 'El término de pago ha sido actualizado correctamente',
        })
      }

      handleOpenChange(false)
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: apiError.response?.data?.message || 'Ocurrió un error',
      })
    }
  }

  return (
    <Dialog open={dialog.open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dialog.mode === 'create' ? 'Nuevo Término de Pago' : 'Editar Término de Pago'}
          </DialogTitle>
          <DialogDescription>
            {dialog.mode === 'create'
              ? 'Crea un nuevo término de pago para asignar a proveedores'
              : 'Modifica los datos del término de pago'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del término</Label>
              <Input
                id="name"
                placeholder="Ej: 30 días, 60 días, Contado"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {dialog.mode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Product Category Dialog Component
function ProductCategoryDialog({
  dialog,
  setDialog,
}: {
  dialog: ProductCategoryDialogState
  setDialog: (value: ProductCategoryDialogState) => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const createMutation = useCreateProductCategory()
  const updateMutation = useUpdateProductCategory()

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('')
      setDialog({ open: false, mode: 'create' })
    } else {
      if (dialog.item) {
        setName(dialog.item.name)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El nombre es requerido',
      })
      return
    }

    try {
      if (dialog.mode === 'create') {
        await createMutation.mutateAsync({ name: name.trim() })
        toast({
          title: 'Categoría creada',
          description: 'La categoría ha sido creada correctamente',
        })
      } else if (dialog.item) {
        await updateMutation.mutateAsync({ id: dialog.item.id, data: { name: name.trim() } })
        toast({
          title: 'Categoría actualizada',
          description: 'La categoría ha sido actualizada correctamente',
        })
      }

      handleOpenChange(false)
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: apiError.response?.data?.message || 'Ocurrió un error',
      })
    }
  }

  return (
    <Dialog open={dialog.open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dialog.mode === 'create' ? 'Nueva Categoría' : 'Editar Categoría'}
          </DialogTitle>
          <DialogDescription>
            {dialog.mode === 'create'
              ? 'Crea una nueva categoría para clasificar productos'
              : 'Modifica los datos de la categoría'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Nombre de la categoría</Label>
              <Input
                id="categoryName"
                placeholder="Ej: Licores, Cervezas, Vinos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {dialog.mode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ========================================
// Deleted Products Tab Component
// ========================================

function DeletedProductsTab() {
  const { toast } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  
  // Fetch all products with includeDeleted=true, then filter deleted ones
  // Use a large pageSize to get all deleted products, then paginate client-side
  const { data: allProductsData, isLoading: isLoadingAll, error } = useProducts({
    page: 1,
    pageSize: 1000,
    includeDeleted: true,
  })
  
  // Filter only deleted products and paginate client-side
  const allDeletedProducts = (allProductsData?.items || [])
    .map(adaptApiProduct)
    .filter((p) => p.deleted === true)
  
  const totalPages = Math.max(1, Math.ceil(allDeletedProducts.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const products = allDeletedProducts.slice(startIndex, endIndex)
  
  const restoreMutation = useRestoreProduct()
  
  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const handleRestore = async (product: Product) => {
    if (!confirm(`¿Restaurar el producto "${product.name}"?`)) return

    try {
      await restoreMutation.mutateAsync(product.id)
      toast({
        title: 'Producto restaurado',
        description: `El producto "${product.name}" ha sido restaurado exitosamente`,
      })
    } catch (error) {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast({
        title: 'Error',
        description: apiError.response?.data?.message || 'No se pudo restaurar el producto',
        variant: 'destructive',
      })
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-red-600">Error al cargar productos eliminados</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos Eliminados</CardTitle>
        <CardDescription>
          Restaura productos que fueron eliminados anteriormente
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingAll ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay productos eliminados
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      {typeof product.category === 'string'
                        ? product.category
                        : (product.category as { name: string }).name || '-'}
                    </TableCell>
                    <TableCell>{product.brand || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={product.stock > 0 ? 'default' : 'secondary'}>
                        {product.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {typeof product.supplier === 'string'
                        ? product.supplier
                        : (product.supplier as { name: string })?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(product)}
                        disabled={restoreMutation.isPending}
                      >
                        {restoreMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restaurar
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            hasNextPage={currentPage < totalPages}
            hasPrevPage={currentPage > 1}
            loading={isLoadingAll}
          />
        )}
      </CardContent>
    </Card>
  )
}
