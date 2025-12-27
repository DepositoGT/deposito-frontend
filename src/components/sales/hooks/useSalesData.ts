/**
 * useSalesData - Custom hook for managing sales data and filters
 */
import { useState, useMemo } from 'react'
import { useSalesByStatus } from '@/hooks/useSales'
import { Sale, PaymentMethod, SaleStatus } from '@/types'
import type { SaleStatusKey, SaleFilters } from '../types'

interface PaginatedSales {
    items: Sale[]
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
    nextPage?: number
    prevPage?: number
}

const mapStatusNameToKey = (name?: string): SaleStatusKey => {
    if (!name) return 'pending'
    const n = name.toLowerCase()
    if (n.includes('complet')) return 'completed'
    if (n.includes('pend')) return 'pending'
    if (n.includes('cancel')) return 'cancelled'
    if (n.includes('pag')) return 'paid'
    return 'pending'
}

export const normalizeRawSale = (raw: unknown): Sale => {
    const r = raw as Record<string, unknown>
    const saleItems = Array.isArray(r.sale_items) ? r.sale_items : []
    const products = saleItems.map((si: unknown) => {
        const s = si as Record<string, unknown>
        const prod = (s.product as Record<string, unknown>) ?? {}
        const id = s.product_id ?? s.id ?? prod.id ?? ''
        const name = prod.name ?? s.name ?? s.product_name ?? 'Producto'
        const priceRaw = s.price ?? s.unit_price ?? prod.price ?? 0
        const price = parseFloat(String(priceRaw)) || 0
        const qty = (s.qty ?? s.quantity ?? s.amount ?? 1) as number
        return { id: String(id), name: String(name), price, qty }
    })

    const totalRaw = r.total ?? r.total_amount ?? '0'
    const totalNum = typeof totalRaw === 'number' ? totalRaw : parseFloat(String(totalRaw)) || 0
    const paymentObj = r.payment_method as Record<string, unknown> | undefined
    const statusObj = r.status as Record<string, unknown> | undefined

    const customerNit = ((): string | undefined => {
        if (typeof r.customer_nit === 'string') return r.customer_nit
        if (typeof (r as Record<string, unknown>).customerNit === 'string')
            return (r as Record<string, unknown>).customerNit as string
        return undefined
    })()

    const isFinalConsumer = Boolean(
        typeof r.is_final_consumer === 'boolean' ? r.is_final_consumer :
            typeof (r as Record<string, unknown>).isFinalConsumer === 'boolean'
                ? (r as Record<string, unknown>).isFinalConsumer : false
    )

    const payment = ((): PaymentMethod => {
        const val = paymentObj?.name ?? r.payment_method ?? (r as Record<string, unknown>).payment
        return String(val || '') as PaymentMethod
    })()

    const status = ((): SaleStatus => {
        const raw = statusObj?.name ?? r.status ?? (r as Record<string, unknown>).status_id
        return mapStatusNameToKey(typeof raw === 'string' ? raw : String(raw || '')) as SaleStatus
    })()

    const amountReceived = parseFloat(String(r.amount_received ?? (r as Record<string, unknown>).amountReceived ?? '0')) || 0
    const change = parseFloat(String(r.change ?? '0')) || 0

    // Process returns data
    const returnsRaw = Array.isArray(r.returns) ? r.returns : []
    const totalReturned = parseFloat(String(r.total_returned ?? '0')) || 0
    const adjustedTotal = parseFloat(String(r.adjusted_total ?? totalNum)) || totalNum
    const hasReturns = returnsRaw.length > 0 || totalReturned > 0

    const returnDetails = returnsRaw
        .filter((ret: unknown) => {
            const retObj = ret as Record<string, unknown>
            const retStatus = (retObj.status as Record<string, unknown>)?.name
            return retStatus === 'Completada'
        })
        .map((ret: unknown) => {
            const retObj = ret as Record<string, unknown>
            const retItems = Array.isArray(retObj.return_items) ? retObj.return_items : []
            const items = retItems.map((item: unknown) => {
                const itemObj = item as Record<string, unknown>
                const product = (itemObj.product as Record<string, unknown>) ?? {}
                return {
                    productName: String(product.name ?? 'Producto'),
                    qty: Number(itemObj.qty_returned ?? 0),
                    refund: parseFloat(String(itemObj.refund_amount ?? '0')) || 0
                }
            })
            const retStatus = (retObj.status as Record<string, unknown>)?.name
            return {
                date: String(retObj.return_date ?? ''),
                status: String(retStatus ?? 'Desconocido'),
                reason: retObj.reason ? String(retObj.reason) : undefined,
                totalRefund: parseFloat(String(retObj.total_refund ?? '0')) || 0,
                items
            }
        })

    return {
        id: String(r.id ?? ''),
        date: String(r.sold_at ?? r.date ?? ''),
        customer: String(r.customer ?? ''),
        customerNit,
        isFinalConsumer,
        total: totalNum,
        totalReturned,
        adjustedTotal,
        hasReturns,
        returnDetails,
        items: (r.items as number) ?? products.length,
        payment,
        status,
        amountReceived,
        change,
        products,
    } as Sale
}

interface UseSalesDataReturn {
    // Filters
    filters: SaleFilters
    setSearchTerm: (term: string) => void
    setStatusFilter: (status: SaleStatus | 'all') => void
    setPaymentFilter: (payment: PaymentMethod | 'all') => void
    setPeriod: (period: string) => void
    // Data
    salesByStatus: Record<SaleStatusKey, Sale[]>
    pageInfoByStatus: Record<SaleStatusKey, { page: number; totalPages: number }>
    isLoadingByStatus: Record<SaleStatusKey, boolean>
    // KPIs
    totalSalesToday: number
    transactionCountToday: number
    averageTicketToday: number
    preferredPaymentMethod: string
    // Pagination
    setPageFor: (key: SaleStatusKey, page: number) => void
    // Actions
    refreshSales: () => void
}

export const useSalesData = (): UseSalesDataReturn => {
    // Filters state
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<SaleStatus | 'all'>('all')
    const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all')
    const [period, setPeriod] = useState('today')

    const [pages, setPages] = useState<Record<SaleStatusKey, number>>({
        pending: 1,
        paid: 1,
        completed: 1,
        cancelled: 1,
    })

    // Queries per status
    const completedQuery = useSalesByStatus('Completada', { period, page: pages.completed, pageSize: 5 })
    const pendingQuery = useSalesByStatus('Pendiente', { period, page: pages.pending, pageSize: 5 })
    const cancelledQuery = useSalesByStatus('Cancelada', { period, page: pages.cancelled, pageSize: 5 })
    const paidQuery = useSalesByStatus('Pagado', { period, page: pages.paid, pageSize: 5 })

    const completedData = completedQuery.data as PaginatedSales | undefined
    const pendingData = pendingQuery.data as PaginatedSales | undefined
    const cancelledData = cancelledQuery.data as PaginatedSales | undefined
    const paidData = paidQuery.data as PaginatedSales | undefined

    const refreshSales = () => {
        completedQuery.refetch?.()
        pendingQuery.refetch?.()
        paidQuery.refetch?.()
        cancelledQuery.refetch?.()
    }

    // Filter client-side
    const filterClient = (items: Sale[] = []) => items.filter(sale => {
        const term = searchTerm.toLowerCase()
        const matchesSearch = !term || [sale.id, sale.customer || '', sale.customerNit || '']
            .some(v => String(v).toLowerCase().includes(term))
        const matchesPayment = paymentFilter === 'all' || sale.payment === paymentFilter
        const matchesStatus = statusFilter === 'all' || sale.status === statusFilter
        return matchesSearch && matchesPayment && matchesStatus
    })

    const salesByStatus: Record<SaleStatusKey, Sale[]> = useMemo(() => ({
        pending: filterClient((pendingData?.items ?? []).map(normalizeRawSale)),
        paid: filterClient((paidData?.items ?? []).map(normalizeRawSale)),
        completed: filterClient((completedData?.items ?? []).map(normalizeRawSale)),
        cancelled: filterClient((cancelledData?.items ?? []).map(normalizeRawSale)),
    }), [pendingData, paidData, completedData, cancelledData, searchTerm, paymentFilter, statusFilter])

    const pageInfoByStatus: Record<SaleStatusKey, { page: number; totalPages: number }> = {
        pending: { page: pendingData?.page ?? pages.pending, totalPages: pendingData?.totalPages ?? 1 },
        paid: { page: paidData?.page ?? pages.paid, totalPages: paidData?.totalPages ?? 1 },
        completed: { page: completedData?.page ?? pages.completed, totalPages: completedData?.totalPages ?? 1 },
        cancelled: { page: cancelledData?.page ?? pages.cancelled, totalPages: cancelledData?.totalPages ?? 1 },
    }

    const isLoadingByStatus: Record<SaleStatusKey, boolean> = {
        completed: completedQuery.isLoading,
        pending: pendingQuery.isLoading,
        cancelled: cancelledQuery.isLoading,
        paid: paidQuery.isLoading,
    }

    const setPageFor = (key: SaleStatusKey, newPage: number) =>
        setPages(prev => ({ ...prev, [key]: newPage }))

    // KPIs (from completed sales only)
    const completedTodaySales = useMemo(() =>
        (completedData?.items ?? []).map(normalizeRawSale),
        [completedData]
    )

    const totalSalesToday = useMemo(() =>
        completedTodaySales.reduce((sum, sale) => sum + (sale.adjustedTotal || sale.total || 0), 0),
        [completedTodaySales]
    )

    const transactionCountToday = completedTodaySales.length

    const averageTicketToday = transactionCountToday > 0
        ? totalSalesToday / transactionCountToday
        : 0

    const preferredPaymentMethod = useMemo(() => {
        const count: Record<string, number> = {}
        completedTodaySales.forEach(sale => {
            const method = sale.payment || 'Desconocido'
            count[method] = (count[method] || 0) + 1
        })
        return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Desconocido'
    }, [completedTodaySales])

    return {
        filters: { searchTerm, statusFilter, paymentFilter, period },
        setSearchTerm,
        setStatusFilter,
        setPaymentFilter,
        setPeriod,
        salesByStatus,
        pageInfoByStatus,
        isLoadingByStatus,
        totalSalesToday,
        transactionCountToday,
        averageTicketToday,
        preferredPaymentMethod,
        setPageFor,
        refreshSales,
    }
}
