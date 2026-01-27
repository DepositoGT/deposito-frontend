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
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Calculator } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DialogTrigger, Dialog } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Sale, SaleStatus } from '@/types'
import { useProducts } from '@/hooks/useProducts'
import { createSale } from '@/services/saleService'
import { updateSaleStatus as apiUpdateSaleStatus } from '@/services/salesService'
import { useRealtimeSales } from '@/hooks/useRealtimeSales'
import { useAuth } from '@/context/useAuth'
import { usePaymentMethods, PaymentMethod as PaymentMethodType } from '@/hooks/usePaymentMethods'

// Feature imports
import { useCart, useSalesData } from './hooks'
import { usePromotions } from '@/hooks/usePromotions'
import {
    SalesKPICards,
    SalesFilters,
    AvailabilityDialog,
    AdminAuthDialog,
    NegativeStockDialog,
    SalesStatusTable,
    SaleDetailDialog,
    NewSaleDialog,
    PromotionCodeInput
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

    // Data hooks
    const paymentMethodsQuery = usePaymentMethods()
    const paymentMethods = useMemo(() => paymentMethodsQuery.data ?? [], [paymentMethodsQuery.data])
    const productsQuery = useProducts()
    const availableProducts = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
    const salesData = useSalesData()
    const cart = useCart({ availableProducts })

    // Promotions hook - prepare cart items for validation
    const promotionCartItems = useMemo(() =>
        cart.cartItems.map(item => ({
            product_id: item.id,
            price: Number(item.price),
            qty: item.qty
        })),
        [cart.cartItems]
    )
    const promotions = usePromotions({
        cartItems: promotionCartItems,
        cartTotal: cart.cartTotal
    })

    // UI state
    const [isNewSaleOpen, setIsNewSaleOpen] = useState(false)
    const [isViewSaleOpen, setIsViewSaleOpen] = useState(false)
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
    const [productSearch, setProductSearch] = useState('')
    const [customer, setCustomer] = useState('')
    const [customerNit, setCustomerNit] = useState('')
    const [isFinalConsumer, setIsFinalConsumer] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | null>(null)
    const [amountReceived, setAmountReceived] = useState('')
    const [isProcessingSale, setIsProcessingSale] = useState(false)
    const [updatingSaleIds, setUpdatingSaleIds] = useState<Set<string>>(new Set())
    const [isValidatingClosure, setIsValidatingClosure] = useState(false)
    const [negativeStockDialog, setNegativeStockDialog] = useState<NegativeStockDialogState>({ open: false, products: [] })

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

    // Computed
    const filteredProducts = useMemo(() =>
        availableProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.barcode ?? '').includes(productSearch)),
        [availableProducts, productSearch]
    )
    const changeAmount = paymentMethod?.name?.toLowerCase() === 'efectivo' && amountReceived
        ? Math.max(0, parseFloat(amountReceived) - promotions.finalTotal) : 0

    // Process sale
    const processSale = async () => {
        if (!paymentMethod) {
            toast({ title: 'Selecciona un método de pago', variant: 'destructive' })
            return
        }
        const isCash = paymentMethod.name?.toLowerCase() === 'efectivo'
        const salePayload = {
            customer,
            customer_nit: customerNit,
            is_final_consumer: isFinalConsumer,
            payment_method_id: paymentMethod.id,
            status_id: 0,
            items: cart.cartItems.map(item => ({ product_id: item.id, price: item.price, qty: item.qty })),
            amount_received: isCash && amountReceived ? Number(amountReceived) : undefined,
            change: isCash ? changeAmount : undefined,
            admin_authorized_products: Array.from(cart.adminAuthorizedProducts),
            promotion_codes: promotions.promotionCodes,
        }
        setIsProcessingSale(true)
        try {
            await createSale(salePayload)
            toast({ title: 'Venta registrada' })
            salesData.refreshSales()
            setIsNewSaleOpen(false)
            cart.clearCart()
            promotions.clearPromotions()
            setCustomer(''); setCustomerNit(''); setPaymentMethod(null); setAmountReceived('')
        } catch (e) {
            toast({ title: 'Error', description: (e as Error)?.message, variant: 'destructive' })
        } finally {
            setIsProcessingSale(false)
        }
    }

    // Status update
    const updateSaleStatus = async (saleId: string, newStatus: SaleStatus) => {
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
                    <Button variant='outline' onClick={handleCashClosure} disabled={isValidatingClosure} className='border-green-600 text-green-600 whitespace-nowrap shrink-0 text-xs sm:text-sm'>
                        <Calculator className='w-4 h-4 sm:mr-2' /><span className='hidden sm:inline'>{isValidatingClosure ? 'Validando...' : 'Cierre de Caja'}</span>
                    </Button>
                    <Dialog open={isNewSaleOpen} onOpenChange={setIsNewSaleOpen}>
                        <DialogTrigger asChild>
                            <Button className='bg-primary hover:bg-primary/90 whitespace-nowrap shrink-0 text-xs sm:text-sm'><Plus className='w-4 h-4 sm:mr-2' /><span className='hidden sm:inline'>Nueva Venta</span></Button>
                        </DialogTrigger>
                    </Dialog>
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

            {/* Sales Tables */}
            <div className='space-y-6'>
                {(['paid', 'pending', 'completed', 'cancelled'] as const).map(key => (
                    <SalesStatusTable
                        key={key}
                        statusKey={key}
                        sales={salesData.salesByStatus[key]}
                        pageInfo={salesData.pageInfoByStatus[key]}
                        isLoading={salesData.isLoadingByStatus[key]}
                        updatingSaleIds={updatingSaleIds}
                        onPageChange={(page) => salesData.setPageFor(key, page)}
                        onStatusChange={updateSaleStatus}
                        onViewSale={(sale) => { setSelectedSale(sale); setIsViewSaleOpen(true) }}
                        onDeleteSale={() => toast({ title: 'Funcionalidad en progreso' })}
                    />
                ))}
            </div>

            {/* Dialogs */}
            <NewSaleDialog
                open={isNewSaleOpen}
                onOpenChange={setIsNewSaleOpen}
                customer={customer}
                onCustomerChange={setCustomer}
                customerNit={customerNit}
                onCustomerNitChange={setCustomerNit}
                isFinalConsumer={isFinalConsumer}
                onFinalConsumerChange={setIsFinalConsumer}
                paymentMethod={paymentMethod}
                paymentMethods={paymentMethods}
                isLoadingPaymentMethods={paymentMethodsQuery.isLoading}
                onPaymentMethodChange={setPaymentMethod}
                cartItems={cart.cartItems}
                cartTotal={cart.cartTotal}
                productSearch={productSearch}
                onProductSearchChange={setProductSearch}
                filteredProducts={filteredProducts}
                isLoadingProducts={productsQuery.isLoading}
                onAddToCart={cart.addToCart}
                onRemoveFromCart={cart.removeFromCart}
                onUpdateQuantity={cart.updateQuantity}
                amountReceived={amountReceived}
                onAmountReceivedChange={setAmountReceived}
                changeAmount={changeAmount}
                isProcessing={isProcessingSale}
                onSubmit={processSale}
                // Promotion props
                appliedPromotions={promotions.appliedPromotions}
                totalDiscount={promotions.totalDiscount}
                finalTotal={promotions.finalTotal}
                isValidatingPromotion={promotions.isValidating}
                onApplyPromoCode={promotions.applyCode}
                onRemovePromotion={promotions.removePromotion}
            />

            <SaleDetailDialog
                open={isViewSaleOpen}
                onOpenChange={setIsViewSaleOpen}
                sale={selectedSale}
            />

            <AvailabilityDialog
                state={cart.availabilityDialog}
                additionalQty={cart.additionalQty}
                onAdditionalQtyChange={cart.setAdditionalQty}
                onConfirm={cart.handleConfirmAdditionalQty}
                onCancel={cart.handleCancelAvailability}
            />

            <AdminAuthDialog
                state={cart.adminAuthDialog}
                username={cart.adminUsername}
                password={cart.adminPassword}
                isAuthenticating={cart.isAuthenticating}
                onUsernameChange={cart.setAdminUsername}
                onPasswordChange={cart.setAdminPassword}
                onConfirm={cart.handleAdminAuth}
                onCancel={cart.closeAdminAuthDialog}
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
