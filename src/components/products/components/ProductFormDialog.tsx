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
 * ProductFormDialog - Shared dialog for creating and editing products
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package, QrCode, DollarSign, Image as ImageIcon } from 'lucide-react'
import type { ProductFormData } from '../types'
import { useToast } from '@/hooks/use-toast'
import { getApiBaseUrl, getAuthToken } from '@/services/api'

interface Category {
    id: string | number
    name: string
}

interface Supplier {
    id: string | number
    name: string
}

interface ProductFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    formData: ProductFormData
    onFormChange: (field: keyof ProductFormData, value: string) => void
    onSubmit: () => void
    onGenerateBarcode: () => void
    categories: Category[] | string[]
    suppliers: Supplier[]
    isLoading: boolean
    submitLabel?: string
}

export const ProductFormDialog = ({
    open,
    onOpenChange,
    title,
    formData,
    onFormChange,
    onSubmit,
    onGenerateBarcode,
    categories,
    suppliers,
    isLoading,
    submitLabel = 'Guardar'
}: ProductFormDialogProps) => {
    const { toast } = useToast()
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const categoriesAreObjects = categories.length > 0 && typeof categories[0] === 'object'

    const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) {
            onFormChange('imageUrl', '')
            return
        }

        try {
            setIsUploadingImage(true)

            // Validar tamaño (máx 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: 'Error',
                    description: 'La imagen no debe exceder 5MB',
                    variant: 'destructive'
                })
                return
            }

            // Validar tipo
            if (!file.type.startsWith('image/')) {
                toast({
                    title: 'Error',
                    description: 'Solo se permiten archivos de imagen',
                    variant: 'destructive'
                })
                return
            }

            // Crear FormData para enviar el archivo
            const formData = new FormData()
            formData.append('image', file)

            // Obtener token de autenticación
            const token = getAuthToken()
            if (!token) {
                toast({
                    title: 'Error de autenticación',
                    description: 'No estás autenticado. Por favor, inicia sesión.',
                    variant: 'destructive'
                })
                return
            }

            // Subir imagen al backend
            const response = await fetch(`${getApiBaseUrl()}/products/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Error al subir la imagen')
            }

            if (!data.imageUrl) {
                throw new Error('No se recibió la URL de la imagen')
            }

            onFormChange('imageUrl', data.imageUrl)
            toast({
                title: 'Imagen subida',
                description: 'La imagen del producto se subió correctamente.'
            })
        } catch (err: unknown) {
            const message = (err as { message?: string })?.message || 'No se pudo subir la imagen'
            toast({
                title: 'Error al subir imagen',
                description: message,
                variant: 'destructive'
            })
        } finally {
            setIsUploadingImage(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Nombre del Producto *</Label>
                            <Input
                                id="name"
                                placeholder="Whisky Buchanans 18..."
                                value={formData.name}
                                onChange={(e) => onFormChange('name', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="category">Categoría *</Label>
                            <Select value={formData.category} onValueChange={(value) => onFormChange('category', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoriesAreObjects
                                        ? (categories as Category[]).map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))
                                        : (categories as string[]).filter(c => c !== 'all').map((category) => (
                                            <SelectItem key={category} value={category}>{category}</SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="brand">Marca</Label>
                            <Input
                                id="brand"
                                placeholder="Buchanans"
                                value={formData.brand}
                                onChange={(e) => onFormChange('brand', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="size">Tamaño</Label>
                            <Input
                                id="size"
                                placeholder="750ml"
                                value={formData.size}
                                onChange={(e) => onFormChange('size', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="price">Precio de Venta *</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Q</span>
                                <Input
                                    id="price"
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.price}
                                    onChange={(e) => onFormChange('price', e.target.value)}
                                    className="pl-10"
                                    step="0.01"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="cost">Costo</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Q</span>
                                <Input
                                    id="cost"
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.cost}
                                    onChange={(e) => onFormChange('cost', e.target.value)}
                                    className="pl-10"
                                    step="0.01"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="stock">Stock Inicial</Label>
                            <div className="relative">
                                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="stock"
                                    type="number"
                                    placeholder="0"
                                    value={formData.stock}
                                    onChange={(e) => onFormChange('stock', e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="minStock">Stock Mínimo</Label>
                            <div className="relative">
                                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="minStock"
                                    type="number"
                                    placeholder="0"
                                    value={formData.minStock}
                                    onChange={(e) => onFormChange('minStock', e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="supplier">Proveedor *</Label>
                        {suppliers.length > 0 ? (
                            <Select value={formData.supplier} onValueChange={(v) => onFormChange('supplier', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar proveedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map((s) => (
                                        <SelectItem key={String(s.id)} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                id="supplier"
                                placeholder="Diageo Guatemala"
                                value={formData.supplier}
                                onChange={(e) => onFormChange('supplier', e.target.value)}
                            />
                        )}
                    </div>
                    <div>
                        <Label htmlFor="barcode">Código de Barras</Label>
                        <div className="flex space-x-2">
                            <Input
                                id="barcode"
                                placeholder="7501001234567"
                                value={formData.barcode}
                                onChange={(e) => onFormChange('barcode', e.target.value)}
                            />
                            <Button type="button" variant="outline" onClick={onGenerateBarcode}>
                                <QrCode className="w-4 h-4 mr-2" />
                                Generar
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            placeholder="Descripción del producto..."
                            value={formData.description}
                            onChange={(e) => onFormChange('description', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Imagen del producto</Label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <Input
                                    id="product-image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    disabled={isUploadingImage || isLoading}
                                />
                            </div>
                            {formData.imageUrl && (
                                <div className="w-16 h-16 rounded-md overflow-hidden border border-border flex items-center justify-center bg-muted">
                                    <img
                                        src={formData.imageUrl}
                                        alt={formData.name || 'Imagen del producto'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = 'none'
                                        }}
                                    />
                                </div>
                            )}
                            {!formData.imageUrl && (
                                <div className="w-16 h-16 rounded-md border border-dashed border-border flex items-center justify-center text-muted-foreground">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Opcional. Se almacenará en el bucket <span className="font-semibold">productos</span> de Supabase.
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isLoading || isUploadingImage}>
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-liquor-amber hover:bg-liquor-amber/90 text-white"
                            onClick={onSubmit}
                            disabled={isLoading || isUploadingImage}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                    Procesando...
                                </>
                            ) : (
                                submitLabel
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
