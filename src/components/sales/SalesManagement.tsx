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
 * SalesManagement - Refactored main component
 * 
 * This component orchestrates the sales management feature.
 * All UI components and business logic are extracted to sub-modules.
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Calculator } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Sale, SaleStatus } from '@/types'
import { updateSaleStatus as apiUpdateSaleStatus } from '@/services/salesService'
import { useRealtimeSales } from '@/hooks/useRealtimeSales'
import { useAuth } from '@/context/useAuth'
import { useAuthPermissions } from '@/hooks/useAuthPermissions'

// Feature imports
import { useSalesData } from './hooks'
import {
    SalesKPICards,
    SalesFilters,
    NegativeStockDialog,
    SalesStatusTable,
    SaleDetailDialog,
} from './components'
import { STATUS_DB_NAMES, NegativeStockDialogState, SaleStatusKey } from './types'
import { useNavigate } from 'react-router-dom'
import { getApiBaseUrl } from '@/services/api'

const API_URL = getApiBaseUrl()

interface SalesManagementProps {
    onSectionChange?: (section: string) => void;
}

const SalesManagement = ({ onSectionChange }: SalesManagementProps) => {
    const navigate = useNavigate()
    const { isAuthenticated } = useAuth()
    const { toast } = useToast()
    const { hasPermission } = useAuthPermissions()

    const salesData = useSalesData()

    // UI state
    const [isViewSaleOpen, setIsViewSaleOpen] = useState(false)
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
    const [updatingSaleIds, setUpdatingSaleIds] = useState<Set<string>>(new Set())
    const [isValidatingClosure, setIsValidatingClosure] = useState(false)
    const [negativeStockDialog, setNegativeStockDialog] = useState<NegativeStockDialogState>({ open: false, products: [] })

    // Permission-based capabilities
    const canCreateSale = hasPermission('sales.create')
    const canChangeSaleStatus = hasPermission('sales.cancel', 'sales.create')
    const canAccessCashClosure = hasPermission('cashclosure.view', 'cashclosure.create')

    // Realtime updates
    useRealtimeSales((newSale: { id: string; customer?: string | null; total?: number | string }) => {
        if (!isAuthenticated) return
        toast({ title: 'Nueva venta registrada', description: `Cliente: ${newSale.customer || 'Consumidor Final'}` })
        salesData.refreshSales()
    }, {
        onUpdate: () => {
            if (!isAuthenticated) return
            salesData.refreshSales()
        }
    })

    // Status update
    const updateSaleStatus = async (saleId: string, newStatus: SaleStatus) => {
        if (!canChangeSaleStatus) {
            toast({ title: 'Sin permiso para cambiar estado de ventas', variant: 'destructive' })
            return
        }
        setUpdatingSaleIds(prev => new Set(prev).add(saleId))
        try {
            await apiUpdateSaleStatus(saleId, { status_name: STATUS_DB_NAMES[newStatus as SaleStatusKey] })
            salesData.refreshSales()
        } catch (e) {
            toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
        } finally {
            setUpdatingSaleIds(prev => { const n = new Set(prev); n.delete(saleId); return n })
        }
    }

    // Cash closure validation
    const handleCashClosure = async () => {
        setIsValidatingClosure(true)
        try {
            const response = await fetch(`${API_URL}/cash-closures/validate-stocks`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            const data = await response.json()
            if (!data.valid && data.products.length > 0) {
                setNegativeStockDialog({ open: true, products: data.products })
            } else {
                navigate('/cierre-caja')
            }
        } catch {
            toast({ title: 'Error', description: 'No se pudo validar el inventario', variant: 'destructive' })
        } finally {
            setIsValidatingClosure(false)
        }
    }

    return (
        <div className='p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in'>
            {/* Header */}
            <div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between'>
                <div className='min-w-0'>
                    <h2 className='text-lg sm:text-2xl font-bold text-foreground'>Ventas</h2>
                    <p className='text-xs sm:text-sm text-muted-foreground'>Control de transacciones</p>
                </div>
                <div className='flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible'>
                    <Select value={salesData.filters.period} onValueChange={salesData.setPeriod}>
                        <SelectTrigger className='w-28 sm:w-36 shrink-0'><Calendar className='w-4 h-4 mr-1 sm:mr-2' /><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value='today'>Hoy</SelectItem>
                            <SelectItem value='week'>Semana</SelectItem>
                            <SelectItem value='month'>Mes</SelectItem>
                        </SelectContent>
                    </Select>
                    {canAccessCashClosure && (
                        <Button
                            variant='outline'
                            onClick={handleCashClosure}
                            disabled={isValidatingClosure}
                            className='border-green-600 text-green-600 whitespace-nowrap shrink-0 text-xs sm:text-sm'
                        >
                            <Calculator className='w-4 h-4 sm:mr-2' />
                            <span className='hidden sm:inline'>
                                {isValidatingClosure ? 'Validando...' : 'Cierre de Caja'}
                            </span>
                        </Button>
                    )}
                    {canCreateSale && (
                        <Button
                            className='bg-primary hover:bg-primary/90 whitespace-nowrap shrink-0 text-xs sm:text-sm'
                            onClick={() => navigate('/ventas/nueva')}
                        >
                            <Plus className='w-4 h-4 sm:mr-2' />
                            <span className='hidden sm:inline'>Nueva Venta</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <SalesKPICards
                totalSalesToday={salesData.totalSalesToday}
                transactionCountToday={salesData.transactionCountToday}
                averageTicketToday={salesData.averageTicketToday}
                preferredPaymentMethod={salesData.preferredPaymentMethod}
            />

            {/* Filters */}
            <SalesFilters
                searchTerm={salesData.filters.searchTerm}
                onSearchChange={salesData.setSearchTerm}
                statusFilter={salesData.filters.statusFilter}
                onStatusChange={salesData.setStatusFilter}
                paymentFilter={salesData.filters.paymentFilter}
                onPaymentChange={salesData.setPaymentFilter}
            />

            {/* Sales Tables (solo Completadas y Canceladas) */}
            <div className='space-y-6'>
                {(['completed', 'cancelled'] as const).map(key => (
                    <SalesStatusTable
                        key={key}
                        statusKey={key}
                        sales={salesData.salesByStatus[key]}
                        pageInfo={salesData.pageInfoByStatus[key]}
                        isLoading={salesData.isLoadingByStatus[key]}
                        updatingSaleIds={updatingSaleIds}
                        onPageChange={(page) => salesData.setPageFor(key, page)}
                        canChangeStatus={canChangeSaleStatus}
                        onStatusChange={updateSaleStatus}
                        onViewSale={(sale) => { setSelectedSale(sale); setIsViewSaleOpen(true) }}
                        onDeleteSale={() => toast({ title: 'Funcionalidad en progreso' })}
                    />
                ))}
            </div>

            <SaleDetailDialog
                open={isViewSaleOpen}
                onOpenChange={setIsViewSaleOpen}
                sale={selectedSale}
            />

            <NegativeStockDialog
                state={negativeStockDialog}
                onClose={() => setNegativeStockDialog({ open: false, products: [] })}
                onGoToInventory={() => {
                    setNegativeStockDialog({ open: false, products: [] })
                    navigate('/inventario')
                }}
            />
        </div>
    )
}

export default SalesManagement
