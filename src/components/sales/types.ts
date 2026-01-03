/**
 * Types specific to the Sales feature
 */
import { Product } from '@/types/product'
import { SaleStatus, PaymentMethod } from '@/types'

export interface CartProduct extends Product {
    qty: number
}

export interface NegativeStockProduct {
    id: string
    name: string
    category: string
    supplier: string
    current_stock: number
    barcode: string | null
    status: string
}

export interface AvailabilityDialogState {
    open: boolean
    product: Product | null
    requestedQty: number
    availableStock: number
}

export interface AdminAuthDialogState {
    open: boolean
    product: Product | null
    requestedQty: number
}

export interface NegativeStockDialogState {
    open: boolean
    products: NegativeStockProduct[]
}

export interface SaleFilters {
    searchTerm: string
    statusFilter: SaleStatus | 'all'
    paymentFilter: PaymentMethod | 'all'
    period: string
}

export type SaleStatusKey = 'pending' | 'paid' | 'completed' | 'cancelled'

export const STATUS_LABELS: Record<SaleStatusKey, string> = {
    pending: 'Pendientes',
    paid: 'Pagadas',
    completed: 'Completadas',
    cancelled: 'Canceladas'
}

export const STATUS_DB_NAMES: Record<SaleStatusKey, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    completed: 'Completada',
    cancelled: 'Cancelada'
}
