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
 * PromotionsManagement - Admin UI for managing discount codes and promotions
 * Supports multiple codes per promotion, auto-generation, PDF export, and product selection
 */
import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Switch } from './ui/switch'
import { Badge } from './ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from './ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from './ui/select'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from './ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from './ui/popover'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from './ui/table'
import { Checkbox } from './ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/services/api'
import { fetchProducts, type ApiProduct } from '@/services/productService'
import { generatePromotionTicketsPDF } from './promotions/generatePromotionTicketsPDF'
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    Tag,
    Percent,
    Gift,
    Sparkles,
    TicketPercent,
    Loader2,
    Copy,
    Shuffle,
    X,
    FileDown,
    Eye,
    TicketIcon,
    ChevronsUpDown,
    Check,
    ShoppingCart,
    Package
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
interface PromotionType {
    id: number
    name: string
    description: string
}

interface PromotionCode {
    id: number
    code: string
    current_uses: number
    active: boolean
    created_at: string
}

interface Promotion {
    id: string
    name: string
    description?: string
    type_id: number
    type: PromotionType
    codes: PromotionCode[]
    discount_value?: string
    discount_percentage?: string
    buy_quantity?: number
    get_quantity?: number
    min_quantity?: number
    trigger_product_id?: string
    target_product_id?: string
    applies_to_all: boolean
    start_date: string
    end_date?: string
    max_uses?: number
    min_purchase_amount?: string
    active: boolean
}

interface PromotionDialogState {
    open: boolean
    mode: 'create' | 'edit'
    item?: Promotion
}

interface CodesDialogState {
    open: boolean
    promotion?: Promotion
}

// Hooks
function usePromotionTypes() {
    return useQuery({
        queryKey: ['promotion-types'],
        queryFn: () => apiFetch<PromotionType[]>('/promotions/types')
    })
}

function usePromotions() {
    return useQuery({
        queryKey: ['promotions'],
        queryFn: async () => {
            const response = await apiFetch<{ items: Promotion[] }>('/promotions')
            return response.items
        }
    })
}

function useProducts() {
    return useQuery({
        queryKey: ['products-list'],
        queryFn: fetchProducts,
        staleTime: 5 * 60 * 1000 // Cache for 5 minutes
    })
}

// Helper function for friendly type names (Spanish)
const getFriendlyTypeName = (typeName: string): string => {
    const names: Record<string, string> = {
        'PERCENTAGE': 'Porcentaje',
        'FIXED_AMOUNT': 'Monto Fijo',
        'BUY_X_GET_Y': 'Lleva X Paga Y',
        'COMBO_DISCOUNT': 'Combo',
        'FREE_GIFT': 'Regalo Gratis',
        'MIN_QTY_DISCOUNT': 'Cantidad Mínima'
    }
    return names[typeName] || typeName
}

// Main Component
const PromotionsManagement = () => {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [dialog, setDialog] = useState<PromotionDialogState>({ open: false, mode: 'create' })
    const [codesDialog, setCodesDialog] = useState<CodesDialogState>({ open: false })

    const { data: promotions = [], isLoading } = usePromotions()
    const { data: promotionTypes = [] } = usePromotionTypes()

    // Filter promotions
    const filteredPromotions = useMemo(() => {
        if (!searchTerm) return promotions
        const term = searchTerm.toLowerCase()
        return promotions.filter(p =>
            p.codes?.some(c => c.code.toLowerCase().includes(term)) ||
            p.name.toLowerCase().includes(term) ||
            p.type?.name.toLowerCase().includes(term)
        )
    }, [promotions, searchTerm])

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) =>
            apiFetch('/promotions', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] })
            toast({ title: 'Promoción creada correctamente' })
            setDialog({ open: false, mode: 'create' })
        },
        onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) =>
            apiFetch(`/promotions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] })
            toast({ title: 'Promoción actualizada' })
            setDialog({ open: false, mode: 'create' })
        },
        onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            apiFetch(`/promotions/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] })
            toast({ title: 'Promoción eliminada' })
        },
        onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
    })

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) =>
            apiFetch(`/promotions/${id}`, { method: 'PUT', body: JSON.stringify({ active }) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] })
        },
        onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
    })

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        toast({ title: 'Código copiado', description: code })
    }

    const getTypeIcon = (typeName: string) => {
        switch (typeName) {
            case 'PERCENTAGE': return <Percent className='w-4 h-4' />
            case 'FIXED_AMOUNT': return <TicketPercent className='w-4 h-4' />
            case 'BUY_X_GET_Y': return <Sparkles className='w-4 h-4' />
            case 'FREE_GIFT': return <Gift className='w-4 h-4' />
            default: return <Tag className='w-4 h-4' />
        }
    }

    const getTypeBadgeColor = (typeName: string) => {
        switch (typeName) {
            case 'PERCENTAGE': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            case 'FIXED_AMOUNT': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            case 'BUY_X_GET_Y': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
            case 'FREE_GIFT': return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300'
            case 'COMBO_DISCOUNT': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
            case 'MIN_QTY_DISCOUNT': return 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const formatPromoValue = (promo: Promotion) => {
        const typeName = promo.type?.name
        if (typeName === 'PERCENTAGE') return `${promo.discount_percentage}% OFF`
        if (typeName === 'FIXED_AMOUNT') return `Q${promo.discount_value} OFF`
        if (typeName === 'BUY_X_GET_Y') return `${promo.buy_quantity}x${(promo.buy_quantity || 0) - (promo.get_quantity || 0)}`
        if (typeName === 'MIN_QTY_DISCOUNT') return `${promo.min_quantity}+ = ${promo.discount_percentage}%`
        if (typeName === 'FREE_GIFT') return '🎁 Regalo'
        if (typeName === 'COMBO_DISCOUNT') return '📦 Combo'
        return '-'
    }

    const getTotalUses = (promo: Promotion) => {
        return promo.codes?.reduce((sum, c) => sum + c.current_uses, 0) || 0
    }

    return (
        <div className='p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in'>
            <Card>
                <CardHeader className='p-3 sm:p-6'>
                    <div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between'>
                        <div>
                            <CardTitle className='flex items-center gap-2 text-lg sm:text-xl'>
                                <Tag className='w-4 h-4 sm:w-5 sm:h-5 text-primary' />
                                Promociones
                            </CardTitle>
                            <CardDescription className='text-xs sm:text-sm'>
                                Administra códigos de descuento
                            </CardDescription>
                        </div>
                        <Button onClick={() => setDialog({ open: true, mode: 'create' })} size='sm' className='w-full sm:w-auto'>
                            <Plus className='w-4 h-4 mr-2' />
                            Nueva Promoción
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className='p-3 sm:p-6 pt-0 sm:pt-0'>
                    {/* Search */}
                    <div className='mb-4'>
                        <div className='relative'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                            <Input
                                placeholder='Buscar...'
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className='pl-10'
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                        <div className='flex justify-center py-8'>
                            <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
                        </div>
                    ) : filteredPromotions.length === 0 ? (
                        <div className='text-center py-8 text-muted-foreground'>
                            {searchTerm ? 'No se encontraron promociones' : 'No hay promociones creadas'}
                        </div>
                    ) : (
                        <div className='rounded-md border overflow-hidden'>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Códigos</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Usos</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className='text-right'>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPromotions.map(promo => (
                                        <TableRow key={promo.id}>
                                            <TableCell>
                                                <div className='flex flex-wrap gap-1 max-w-[200px]'>
                                                    {promo.codes?.slice(0, 2).map(c => (
                                                        <code key={c.id} className='bg-muted px-1.5 py-0.5 rounded text-xs font-mono'>
                                                            {c.code}
                                                        </code>
                                                    ))}
                                                    {promo.codes?.length > 0 && (
                                                        <Button
                                                            variant='ghost'
                                                            size='sm'
                                                            className='h-6 px-2 text-xs'
                                                            onClick={() => setCodesDialog({ open: true, promotion: promo })}
                                                        >
                                                            <Eye className='w-3 h-3 mr-1' />
                                                            Ver {promo.codes.length > 2 ? `+${promo.codes.length - 2}` : 'todos'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className='font-medium'>{promo.name}</TableCell>
                                            <TableCell>
                                                <Badge className={`flex items-center gap-1 w-fit ${getTypeBadgeColor(promo.type?.name)}`}>
                                                    {getTypeIcon(promo.type?.name)}
                                                    <span className='text-xs'>{getFriendlyTypeName(promo.type?.name)}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className='font-semibold text-green-600 dark:text-green-400'>
                                                {formatPromoValue(promo)}
                                            </TableCell>
                                            <TableCell>
                                                <span className='text-muted-foreground'>
                                                    {getTotalUses(promo)}{promo.max_uses ? `/${promo.max_uses}` : ''}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={promo.active}
                                                    onCheckedChange={(active) =>
                                                        toggleActiveMutation.mutate({ id: promo.id, active })
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className='text-right'>
                                                <div className='flex justify-end gap-1'>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => setDialog({ open: true, mode: 'edit', item: promo })}
                                                    >
                                                        <Pencil className='w-4 h-4' />
                                                    </Button>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        className='text-destructive hover:text-destructive'
                                                        onClick={() => deleteMutation.mutate(promo.id)}
                                                    >
                                                        <Trash2 className='w-4 h-4' />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <PromotionDialog
                dialog={dialog}
                setDialog={setDialog}
                promotionTypes={promotionTypes}
                onCreate={createMutation.mutate}
                onUpdate={updateMutation.mutate}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />

            {/* Codes Dialog with PDF Export */}
            <CodesDialog
                dialog={codesDialog}
                setDialog={setCodesDialog}
                onCopyCode={copyCode}
            />
        </div>
    )
}

// ============================================
// Codes Dialog with PDF Export
// ============================================
interface CodesDialogProps {
    dialog: CodesDialogState
    setDialog: (state: CodesDialogState) => void
    onCopyCode: (code: string) => void
}

const CodesDialog = ({ dialog, setDialog, onCopyCode }: CodesDialogProps) => {
    const [selectedCodes, setSelectedCodes] = useState<string[]>([])
    const [termsText, setTermsText] = useState('Válido solo en tiendas participantes. No acumulable con otras promociones.')

    const promotion = dialog.promotion

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedCodes(promotion?.codes?.map(c => c.code) || [])
        } else {
            setSelectedCodes([])
        }
    }

    const handleSelectCode = (code: string, checked: boolean) => {
        if (checked) {
            setSelectedCodes([...selectedCodes, code])
        } else {
            setSelectedCodes(selectedCodes.filter(c => c !== code))
        }
    }

    const handleGeneratePDF = () => {
        if (!promotion) return

        const codesToExport = selectedCodes.length > 0
            ? promotion.codes?.filter(c => selectedCodes.includes(c.code)) || []
            : promotion.codes || []

        generatePromotionTicketsPDF({
            codes: codesToExport,
            promotion: promotion,
            terms: termsText
        })
    }

    const codeCount = selectedCodes.length > 0
        ? selectedCodes.length
        : (promotion?.codes?.length || 0)

    return (
        <Dialog open={dialog.open} onOpenChange={(open) => setDialog({ ...dialog, open })}>
            <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <TicketIcon className='w-5 h-5' />
                        Códigos de Promoción
                    </DialogTitle>
                    <DialogDescription>
                        {promotion?.name} - {promotion?.codes?.length || 0} códigos disponibles
                    </DialogDescription>
                </DialogHeader>

                {promotion && (
                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='terms'>Términos y Condiciones (para el PDF)</Label>
                            <Textarea
                                id='terms'
                                value={termsText}
                                onChange={e => setTermsText(e.target.value)}
                                rows={2}
                                className='text-sm'
                            />
                        </div>

                        <div className='border rounded-lg'>
                            <div className='p-3 bg-muted/50 border-b flex items-center justify-between'>
                                <div className='flex items-center gap-2'>
                                    <Checkbox
                                        checked={selectedCodes.length === promotion.codes?.length}
                                        onCheckedChange={handleSelectAll}
                                    />
                                    <span className='text-sm font-medium'>Seleccionar todos</span>
                                </div>
                                <Badge variant='secondary'>
                                    {selectedCodes.length} seleccionados
                                </Badge>
                            </div>
                            <div className='max-h-[200px] overflow-y-auto'>
                                <Table>
                                    <TableBody>
                                        {promotion.codes?.map(c => (
                                            <TableRow key={c.id}>
                                                <TableCell className='w-10'>
                                                    <Checkbox
                                                        checked={selectedCodes.includes(c.code)}
                                                        onCheckedChange={(checked) => handleSelectCode(c.code, !!checked)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <code className='bg-muted px-2 py-1 rounded font-mono text-sm'>
                                                        {c.code}
                                                    </code>
                                                </TableCell>
                                                <TableCell className='text-muted-foreground text-sm'>
                                                    Usos: {c.current_uses}{promotion.max_uses ? `/${promotion.max_uses}` : ''}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={c.active ? 'default' : 'secondary'}>
                                                        {c.active ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className='text-right'>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => onCopyCode(c.code)}
                                                    >
                                                        <Copy className='w-4 h-4' />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant='outline' onClick={() => setDialog({ ...dialog, open: false })}>
                        Cerrar
                    </Button>
                    <Button onClick={handleGeneratePDF} disabled={codeCount === 0}>
                        <FileDown className='w-4 h-4 mr-2' />
                        Descargar PDF {selectedCodes.length > 0 ? `(${selectedCodes.length})` : 'Todos'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ============================================
// Product Combobox Component
// ============================================
interface ProductComboboxProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    label?: string
    icon?: React.ReactNode
}

const ProductCombobox = ({ value, onChange, placeholder, label, icon }: ProductComboboxProps) => {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const { data: products = [], isLoading } = useProducts()

    const filteredProducts = useMemo(() => {
        if (!search) return products.slice(0, 50) // Limit initial results
        const term = search.toLowerCase()
        return products.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.barcode?.toLowerCase().includes(term)
        ).slice(0, 50)
    }, [products, search])

    const selectedProduct = products.find(p => p.id === value)

    return (
        <div className='space-y-1'>
            {label && <Label className='text-xs text-muted-foreground'>{label}</Label>}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant='outline'
                        role='combobox'
                        aria-expanded={open}
                        className='w-full justify-between font-normal'
                    >
                        <div className='flex items-center gap-2 truncate'>
                            {icon}
                            {selectedProduct ? (
                                <span className='truncate'>{selectedProduct.name}</span>
                            ) : (
                                <span className='text-muted-foreground'>{placeholder || 'Seleccionar producto...'}</span>
                            )}
                        </div>
                        <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className='w-[400px] p-0' align='start'>
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder='Buscar producto...'
                            value={search}
                            onValueChange={setSearch}
                        />
                        <CommandList>
                            {isLoading ? (
                                <div className='flex items-center justify-center py-6'>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <CommandEmpty>No se encontraron productos</CommandEmpty>
                            ) : (
                                <CommandGroup>
                                    {filteredProducts.map((product) => (
                                        <CommandItem
                                            key={product.id}
                                            value={product.id}
                                            onSelect={() => {
                                                onChange(product.id)
                                                setOpen(false)
                                                setSearch('')
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4',
                                                    value === product.id ? 'opacity-100' : 'opacity-0'
                                                )}
                                            />
                                            <div className='flex flex-col'>
                                                <span className='font-medium'>{product.name}</span>
                                                <span className='text-xs text-muted-foreground'>
                                                    Q{product.price.toFixed(2)} • {product.category}
                                                </span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}

// ============================================
// Promotion Dialog Component
// ============================================
interface PromotionDialogProps {
    dialog: PromotionDialogState
    setDialog: (state: PromotionDialogState) => void
    promotionTypes: PromotionType[]
    onCreate: (data: Record<string, unknown>) => void
    onUpdate: (data: Record<string, unknown> & { id: string }) => void
    isLoading: boolean
}

const PromotionDialog = ({ dialog, setDialog, promotionTypes, onCreate, onUpdate, isLoading }: PromotionDialogProps) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type_id: 1,
        discount_percentage: '',
        discount_value: '',
        buy_quantity: '',
        get_quantity: '',
        min_quantity: '',
        trigger_product_id: '',
        target_product_id: '',
        applies_to_all: true,
        start_date: '',
        end_date: '',
        max_uses: '',
        min_purchase_amount: ''
    })

    // Code generation state
    const [codeMode, setCodeMode] = useState<'auto' | 'manual'>('auto')
    const [codeCount, setCodeCount] = useState('1')
    const [codePrefix, setCodePrefix] = useState('')
    const [manualCodes, setManualCodes] = useState<string[]>([])
    const [newManualCode, setNewManualCode] = useState('')

    // Reset form when dialog opens
    const handleOpenChange = (open: boolean) => {
        if (open && dialog.mode === 'edit' && dialog.item) {
            setFormData({
                name: dialog.item.name,
                description: dialog.item.description || '',
                type_id: dialog.item.type_id,
                discount_percentage: dialog.item.discount_percentage || '',
                discount_value: dialog.item.discount_value || '',
                buy_quantity: dialog.item.buy_quantity?.toString() || '',
                get_quantity: dialog.item.get_quantity?.toString() || '',
                min_quantity: dialog.item.min_quantity?.toString() || '',
                trigger_product_id: dialog.item.trigger_product_id || '',
                target_product_id: dialog.item.target_product_id || '',
                applies_to_all: dialog.item.applies_to_all,
                start_date: dialog.item.start_date?.split('T')[0] || '',
                end_date: dialog.item.end_date?.split('T')[0] || '',
                max_uses: dialog.item.max_uses?.toString() || '',
                min_purchase_amount: dialog.item.min_purchase_amount || ''
            })
            setCodeMode('manual')
            setManualCodes(dialog.item.codes?.map(c => c.code) || [])
        } else if (open && dialog.mode === 'create') {
            setFormData({
                name: '',
                description: '',
                type_id: 1,
                discount_percentage: '',
                discount_value: '',
                buy_quantity: '',
                get_quantity: '',
                min_quantity: '',
                trigger_product_id: '',
                target_product_id: '',
                applies_to_all: true,
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                max_uses: '',
                min_purchase_amount: ''
            })
            setCodeMode('auto')
            setCodeCount('1')
            setCodePrefix('')
            setManualCodes([])
        }
        setDialog({ ...dialog, open })
    }

    const addManualCode = () => {
        if (newManualCode.trim() && !manualCodes.includes(newManualCode.toUpperCase())) {
            setManualCodes([...manualCodes, newManualCode.toUpperCase()])
            setNewManualCode('')
        }
    }

    const removeManualCode = (code: string) => {
        setManualCodes(manualCodes.filter(c => c !== code))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const payload: Record<string, unknown> = {
            name: formData.name,
            description: formData.description || null,
            type_id: formData.type_id,
            applies_to_all: formData.applies_to_all,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
            min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : null
        }

        // Add type-specific fields
        const selectedType = promotionTypes.find(t => t.id === formData.type_id)
        if (selectedType?.name === 'PERCENTAGE' || selectedType?.name === 'MIN_QTY_DISCOUNT') {
            payload.discount_percentage = formData.discount_percentage ? parseFloat(formData.discount_percentage) : null
        }
        if (selectedType?.name === 'FIXED_AMOUNT') {
            payload.discount_value = formData.discount_value ? parseFloat(formData.discount_value) : null
        }
        if (selectedType?.name === 'BUY_X_GET_Y') {
            payload.buy_quantity = formData.buy_quantity ? parseInt(formData.buy_quantity) : null
            payload.get_quantity = formData.get_quantity ? parseInt(formData.get_quantity) : null
        }
        if (selectedType?.name === 'MIN_QTY_DISCOUNT') {
            payload.min_quantity = formData.min_quantity ? parseInt(formData.min_quantity) : null
        }
        // FREE_GIFT and COMBO_DISCOUNT require trigger and target products
        if (selectedType?.name === 'FREE_GIFT' || selectedType?.name === 'COMBO_DISCOUNT') {
            payload.trigger_product_id = formData.trigger_product_id || null
            payload.target_product_id = formData.target_product_id || null
            if (selectedType?.name === 'COMBO_DISCOUNT') {
                payload.discount_percentage = formData.discount_percentage ? parseFloat(formData.discount_percentage) : null
            }
        }

        // Handle codes
        if (dialog.mode === 'create') {
            if (codeMode === 'auto') {
                payload.code_count = parseInt(codeCount) || 1
                payload.code_prefix = codePrefix.toUpperCase()
            } else {
                payload.codes = manualCodes
            }
        }

        if (dialog.mode === 'edit' && dialog.item) {
            onUpdate({ ...payload, id: dialog.item.id })
        } else {
            onCreate(payload)
        }
    }

    const selectedType = promotionTypes.find(t => t.id === formData.type_id)

    return (
        <Dialog open={dialog.open} onOpenChange={handleOpenChange}>
            <DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
                <DialogHeader>
                    <DialogTitle>
                        {dialog.mode === 'create' ? 'Nueva Promoción' : 'Editar Promoción'}
                    </DialogTitle>
                    <DialogDescription>
                        {dialog.mode === 'create'
                            ? 'Crea una promoción con uno o varios códigos'
                            : 'Modifica los datos de la promoción'
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className='space-y-4'>
                    {/* Code Generation - Only for create mode */}
                    {dialog.mode === 'create' && (
                        <div className='border rounded-lg p-4 space-y-3 bg-muted/30'>
                            <Label className='font-medium'>Códigos de Promoción</Label>

                            <div className='flex gap-2'>
                                <Button
                                    type='button'
                                    variant={codeMode === 'auto' ? 'default' : 'outline'}
                                    size='sm'
                                    onClick={() => setCodeMode('auto')}
                                >
                                    <Shuffle className='w-4 h-4 mr-1' />
                                    Generar
                                </Button>
                                <Button
                                    type='button'
                                    variant={codeMode === 'manual' ? 'default' : 'outline'}
                                    size='sm'
                                    onClick={() => setCodeMode('manual')}
                                >
                                    <Pencil className='w-4 h-4 mr-1' />
                                    Manual
                                </Button>
                            </div>

                            {codeMode === 'auto' ? (
                                <div className='grid grid-cols-2 gap-3'>
                                    <div>
                                        <Label htmlFor='codeCount' className='text-xs'>Cantidad</Label>
                                        <Input
                                            id='codeCount'
                                            type='number'
                                            min='1'
                                            max='100'
                                            value={codeCount}
                                            onChange={e => setCodeCount(e.target.value)}
                                            placeholder='1'
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor='codePrefix' className='text-xs'>Prefijo (opcional)</Label>
                                        <Input
                                            id='codePrefix'
                                            value={codePrefix}
                                            onChange={e => setCodePrefix(e.target.value.toUpperCase())}
                                            placeholder='DESC'
                                            className='uppercase'
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className='space-y-2'>
                                    <div className='flex gap-2'>
                                        <Input
                                            value={newManualCode}
                                            onChange={e => setNewManualCode(e.target.value.toUpperCase())}
                                            placeholder='Escribe un código'
                                            className='uppercase font-mono'
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addManualCode() } }}
                                        />
                                        <Button type='button' size='sm' onClick={addManualCode}>
                                            <Plus className='w-4 h-4' />
                                        </Button>
                                    </div>
                                    {manualCodes.length > 0 && (
                                        <div className='flex flex-wrap gap-1'>
                                            {manualCodes.map(code => (
                                                <Badge key={code} variant='secondary' className='font-mono'>
                                                    {code}
                                                    <Button
                                                        type='button'
                                                        variant='ghost'
                                                        size='sm'
                                                        className='h-4 w-4 p-0 ml-1'
                                                        onClick={() => removeManualCode(code)}
                                                    >
                                                        <X className='w-3 h-3' />
                                                    </Button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Name and Type */}
                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <Label htmlFor='name'>Nombre *</Label>
                            <Input
                                id='name'
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder='10% Descuento'
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor='type'>Tipo *</Label>
                            <Select
                                value={formData.type_id.toString()}
                                onValueChange={v => setFormData({ ...formData, type_id: parseInt(v) })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {promotionTypes.map(t => (
                                        <SelectItem key={t.id} value={t.id.toString()}>
                                            {getFriendlyTypeName(t.name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor='description'>Descripción <span className='text-xs text-muted-foreground'>(máx. 30 palabras / 170 caracteres)</span></Label>
                        <Textarea
                            id='description'
                            value={formData.description}
                            onChange={e => {
                                const newValue = e.target.value
                                const words = newValue.trim().split(/\s+/).filter(w => w.length > 0)
                                const isDeleting = newValue.length < formData.description.length
                                // Allow if deleting, or if both limits are satisfied
                                if (isDeleting || (words.length <= 30 && newValue.length <= 170)) {
                                    setFormData({ ...formData, description: newValue })
                                }
                            }}
                            placeholder='Descripción opcional...'
                            rows={2}
                            maxLength={170}
                        />
                        <div className='text-xs text-muted-foreground text-right mt-1 flex justify-between'>
                            <span>{formData.description.length}/170 caracteres</span>
                            <span>{formData.description.trim().split(/\s+/).filter(w => w.length > 0).length}/30 palabras</span>
                        </div>
                    </div>

                    {/* Conditional Fields based on Type */}
                    {(selectedType?.name === 'PERCENTAGE' || selectedType?.name === 'MIN_QTY_DISCOUNT') && (
                        <div>
                            <Label htmlFor='discount_percentage'>Porcentaje de Descuento (%)</Label>
                            <Input
                                id='discount_percentage'
                                type='number'
                                min='0'
                                max='100'
                                step='0.01'
                                value={formData.discount_percentage}
                                onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })}
                                placeholder='10'
                            />
                        </div>
                    )}

                    {selectedType?.name === 'FIXED_AMOUNT' && (
                        <div>
                            <Label htmlFor='discount_value'>Monto de Descuento (Q)</Label>
                            <Input
                                id='discount_value'
                                type='number'
                                min='0'
                                step='0.01'
                                value={formData.discount_value}
                                onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                placeholder='50.00'
                            />
                        </div>
                    )}

                    {selectedType?.name === 'BUY_X_GET_Y' && (
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <Label htmlFor='buy_quantity'>Compra (cantidad)</Label>
                                <Input
                                    id='buy_quantity'
                                    type='number'
                                    min='1'
                                    value={formData.buy_quantity}
                                    onChange={e => setFormData({ ...formData, buy_quantity: e.target.value })}
                                    placeholder='2'
                                />
                            </div>
                            <div>
                                <Label htmlFor='get_quantity'>Gratis (cantidad)</Label>
                                <Input
                                    id='get_quantity'
                                    type='number'
                                    min='1'
                                    value={formData.get_quantity}
                                    onChange={e => setFormData({ ...formData, get_quantity: e.target.value })}
                                    placeholder='1'
                                />
                            </div>
                        </div>
                    )}

                    {selectedType?.name === 'MIN_QTY_DISCOUNT' && (
                        <div>
                            <Label htmlFor='min_quantity'>Cantidad Mínima</Label>
                            <Input
                                id='min_quantity'
                                type='number'
                                min='1'
                                value={formData.min_quantity}
                                onChange={e => setFormData({ ...formData, min_quantity: e.target.value })}
                                placeholder='3'
                            />
                        </div>
                    )}

                    {/* FREE_GIFT Configuration */}
                    {selectedType?.name === 'FREE_GIFT' && (
                        <div className='border rounded-lg p-4 space-y-4 bg-pink-50 dark:bg-pink-950/20'>
                            <div className='flex items-center gap-2 text-pink-700 dark:text-pink-300'>
                                <Gift className='w-4 h-4' />
                                <span className='font-medium text-sm'>Configuración de Regalo Gratis</span>
                            </div>
                            <p className='text-xs text-muted-foreground'>
                                Cuando el cliente compre el "Producto Activador", recibirá gratis el "Producto Regalo"
                            </p>
                            <div className='space-y-3'>
                                <ProductCombobox
                                    value={formData.trigger_product_id}
                                    onChange={v => setFormData({ ...formData, trigger_product_id: v })}
                                    label='🛒 Producto Activador (el que compra)'
                                    placeholder='Seleccionar producto...'
                                    icon={<ShoppingCart className='w-4 h-4 text-muted-foreground' />}
                                />
                                <ProductCombobox
                                    value={formData.target_product_id}
                                    onChange={v => setFormData({ ...formData, target_product_id: v })}
                                    label='🎁 Producto Regalo (gratis)'
                                    placeholder='Seleccionar producto regalo...'
                                    icon={<Package className='w-4 h-4 text-muted-foreground' />}
                                />
                            </div>
                        </div>
                    )}

                    {/* COMBO_DISCOUNT Configuration */}
                    {selectedType?.name === 'COMBO_DISCOUNT' && (
                        <div className='border rounded-lg p-4 space-y-4 bg-orange-50 dark:bg-orange-950/20'>
                            <div className='flex items-center gap-2 text-orange-700 dark:text-orange-300'>
                                <Sparkles className='w-4 h-4' />
                                <span className='font-medium text-sm'>Configuración de Combo</span>
                            </div>
                            <p className='text-xs text-muted-foreground'>
                                Cuando el cliente compre el "Producto A", obtiene descuento en el "Producto B"
                            </p>
                            <div className='space-y-3'>
                                <ProductCombobox
                                    value={formData.trigger_product_id}
                                    onChange={v => setFormData({ ...formData, trigger_product_id: v })}
                                    label='🛒 Producto A (el que debe comprar)'
                                    placeholder='Seleccionar producto...'
                                    icon={<ShoppingCart className='w-4 h-4 text-muted-foreground' />}
                                />
                                <ProductCombobox
                                    value={formData.target_product_id}
                                    onChange={v => setFormData({ ...formData, target_product_id: v })}
                                    label='📦 Producto B (recibe descuento)'
                                    placeholder='Seleccionar producto...'
                                    icon={<Package className='w-4 h-4 text-muted-foreground' />}
                                />
                                <div>
                                    <Label htmlFor='combo_percentage' className='text-xs'>% Descuento en Producto B</Label>
                                    <Input
                                        id='combo_percentage'
                                        type='number'
                                        min='0'
                                        max='100'
                                        step='1'
                                        value={formData.discount_percentage}
                                        onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })}
                                        placeholder='50'
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <Label htmlFor='start_date'>Fecha Inicio</Label>
                            <Input
                                id='start_date'
                                type='date'
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor='end_date'>Fecha Fin</Label>
                            <Input
                                id='end_date'
                                type='date'
                                value={formData.end_date}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <Label htmlFor='max_uses'>Usos Máximos por Código</Label>
                            <Input
                                id='max_uses'
                                type='number'
                                min='0'
                                value={formData.max_uses}
                                onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                                placeholder='Ilimitado'
                            />
                        </div>
                        <div>
                            <Label htmlFor='min_purchase'>Compra Mínima (Q)</Label>
                            <Input
                                id='min_purchase'
                                type='number'
                                min='0'
                                step='0.01'
                                value={formData.min_purchase_amount}
                                onChange={e => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                                placeholder='0.00'
                            />
                        </div>
                    </div>

                    <div className='flex items-center space-x-2'>
                        <Switch
                            id='applies_to_all'
                            checked={formData.applies_to_all}
                            onCheckedChange={v => setFormData({ ...formData, applies_to_all: v })}
                        />
                        <Label htmlFor='applies_to_all'>Aplica a todos los productos</Label>
                    </div>

                    <DialogFooter>
                        <Button type='button' variant='outline' onClick={() => setDialog({ ...dialog, open: false })}>
                            Cancelar
                        </Button>
                        <Button type='submit' disabled={isLoading}>
                            {isLoading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
                            {dialog.mode === 'create' ? 'Crear' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default PromotionsManagement
