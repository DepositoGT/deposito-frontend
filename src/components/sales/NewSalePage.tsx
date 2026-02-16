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
 * NewSalePage - Página de nueva venta con layout de dos columnas:
 * Izquierda: información de la venta (cliente, pago, carrito, total, registrar).
 * Derecha: productos en cards con imagen y opción de agregar a la venta.
 * Al registrar, la venta queda en estado Completada y se descuenta stock.
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Receipt, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAllProducts } from '@/hooks/useProducts'
import { usePaymentMethods, PaymentMethod as PaymentMethodType } from '@/hooks/usePaymentMethods'
import { useAuthPermissions } from '@/hooks/useAuthPermissions'
import { createSale } from '@/services/saleService'
import type { Product } from '@/types/product'

import { useCart, useSalesData } from './hooks'
import { usePromotions } from '@/hooks/usePromotions'
import {
  AvailabilityDialog,
  AdminAuthDialog,
  PromotionCodeInput,
} from './components'
import type { CartProduct } from './types'

const ProductCard = ({
  product,
  onAdd,
  disabled,
}: {
  product: Product
  onAdd: () => void
  disabled?: boolean
}) => (
  <Card className="overflow-hidden transition-shadow hover:shadow-md">
    <div className="aspect-square bg-muted relative">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
          Sin imagen
        </div>
      )}
    </div>
    <CardContent className="p-3">
      <p className="font-medium text-sm truncate" title={product.name}>
        {product.name}
      </p>
      <p className="text-xs text-muted-foreground">
        Q {Number(product.price).toFixed(2)} · Stock: {product.stock ?? 0}
      </p>
      <Button
        size="sm"
        className="w-full mt-2"
        onClick={onAdd}
        disabled={disabled}
      >
        <Plus className="w-4 h-4 mr-1" />
        Agregar
      </Button>
    </CardContent>
  </Card>
)

export default function NewSalePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { hasPermission } = useAuthPermissions()
  const salesData = useSalesData()

  const paymentMethodsQuery = usePaymentMethods()
  const paymentMethods = useMemo(() => paymentMethodsQuery.data ?? [], [paymentMethodsQuery.data])
  const productsQuery = useAllProducts()
  const availableProducts = useMemo(() => productsQuery.data ?? [], [productsQuery.data])

  const [productSearch, setProductSearch] = useState('')
  const [productPage, setProductPage] = useState(1)
  const [customer, setCustomer] = useState('')
  const [customerNit, setCustomerNit] = useState('')
  const [isFinalConsumer, setIsFinalConsumer] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | null>(null)
  const [amountReceived, setAmountReceived] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const cart = useCart({ availableProducts })
  const promotionCartItems = useMemo(
    () =>
      cart.cartItems.map((item) => ({
        product_id: item.id,
        price: Number(item.price),
        qty: item.qty,
      })),
    [cart.cartItems]
  )
  const promotions = usePromotions({
    cartItems: promotionCartItems,
    cartTotal: cart.cartTotal,
  })

  const filteredProducts = useMemo(
    () =>
      availableProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          (p.barcode ?? '').includes(productSearch)
      ),
    [availableProducts, productSearch]
  )

  const pageSize = 9
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const safePage = Math.min(productPage, totalPages)
  const pageProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, safePage])

  const displayTotal = promotions.finalTotal ?? cart.cartTotal
  const changeAmount =
    paymentMethod?.name?.toLowerCase() === 'efectivo' && amountReceived
      ? Math.max(0, parseFloat(amountReceived) - displayTotal)
      : 0

  const canCreate = hasPermission('sales.create')

  const handleSubmit = async () => {
    if (!canCreate) {
      toast({ title: 'Sin permiso para crear ventas', variant: 'destructive' })
      return
    }
    if (!paymentMethod) {
      toast({ title: 'Selecciona un método de pago', variant: 'destructive' })
      return
    }
    if (cart.cartItems.length === 0) {
      toast({ title: 'Agrega al menos un producto', variant: 'destructive' })
      return
    }
    const isCash = paymentMethod.name?.toLowerCase() === 'efectivo'
    const payload = {
      customer,
      customer_nit: customerNit,
      is_final_consumer: isFinalConsumer,
      payment_method_id: paymentMethod.id,
      status_id: 0,
      items: cart.cartItems.map((item: CartProduct) => ({
        product_id: item.id,
        price: item.price,
        qty: item.qty,
      })),
      amount_received: isCash && amountReceived ? Number(amountReceived) : undefined,
      change: isCash ? changeAmount : undefined,
      admin_authorized_products: Array.from(cart.adminAuthorizedProducts),
      promotion_codes: promotions.promotionCodes,
    }
    setIsProcessing(true)
    try {
      await createSale(payload)
      toast({ title: 'Venta registrada correctamente' })
      salesData.refreshSales()
      cart.clearCart()
      promotions.clearPromotions()
      setCustomer('')
      setCustomerNit('')
      setPaymentMethod(null)
      setAmountReceived('')
    } catch (e) {
      toast({
        title: 'Error al registrar la venta',
        description: (e as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="px-4 sm:px-8 lg:px-14 py-4 sm:py-6 w-full animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ventas')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Nueva Venta</h1>
          <p className="text-sm text-muted-foreground">
            Completa la información y agrega productos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Columna izquierda: información de la venta */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información de la venta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer">Cliente *</Label>
                <Input
                  id="customer"
                  placeholder="Nombre del cliente"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="nit">NIT</Label>
                <Input
                  id="nit"
                  placeholder="12345678-9"
                  value={customerNit}
                  onChange={(e) => setCustomerNit(e.target.value)}
                  disabled={isFinalConsumer}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cf"
                  checked={isFinalConsumer}
                  onChange={(e) => {
                    setIsFinalConsumer(e.target.checked)
                    if (e.target.checked) setCustomerNit('')
                  }}
                  className="rounded"
                />
                <Label htmlFor="cf">Consumidor final (CF)</Label>
              </div>
              <div>
                <Label>Método de pago *</Label>
                <Select
                  value={paymentMethod ? String(paymentMethod.id) : ''}
                  onValueChange={(val) => {
                    const found = paymentMethods.find((pm) => String(pm.id) === val)
                    setPaymentMethod(found ?? null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {paymentMethod?.name?.toLowerCase() === 'efectivo' && (
                <div>
                  <Label htmlFor="amount">Monto recibido</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    step="0.01"
                  />
                  {amountReceived && parseFloat(amountReceived) >= displayTotal && (
                    <p className="text-sm text-primary mt-1">
                      Vuelto: Q {changeAmount.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Carrito y total */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Productos en la venta ({cart.cartItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.cartItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Agrega productos desde la lista de la derecha
                </p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.cartItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between items-center text-sm py-1 border-b border-border/50"
                    >
                      <span className="truncate flex-1">{item.name}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => cart.updateQuantity(item.id, item.qty - 1)}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          className="w-14 h-7 px-2 text-center text-sm"
                          value={item.qty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value || '0', 10)
                            if (!Number.isNaN(val) && val > 0) {
                              cart.updateQuantity(item.id, val)
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => cart.updateQuantity(item.id, item.qty + 1)}
                        >
                          +
                        </Button>
                        <span className="w-24 text-right">
                          Q {(item.qty * item.price).toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => cart.removeFromCart(item.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {promotions.appliedPromotions?.length ? (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Descuentos aplicados</p>
                  <p className="text-green-600 font-medium">
                    -Q {(promotions.totalDiscount ?? 0).toFixed(2)}
                  </p>
                </div>
              ) : null}
              <div className="flex justify-between font-semibold text-lg pt-2">
                <span>Total</span>
                <span>Q {displayTotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <PromotionCodeInput
            appliedPromotions={promotions.appliedPromotions ?? []}
            totalDiscount={promotions.totalDiscount ?? 0}
            isValidating={promotions.isValidating ?? false}
            onApplyCode={promotions.applyCode}
            onRemovePromotion={promotions.removePromotion}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/ventas')}
              disabled={isProcessing}
            >
              Volver a ventas
            </Button>
            <Button
              className="flex-1 bg-primary"
              onClick={handleSubmit}
              disabled={
                cart.cartItems.length === 0 || !paymentMethod || isProcessing
              }
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  Procesando...
                </span>
              ) : (
                <>
                  <Receipt className="w-4 h-4 mr-2" />
                  Registrar venta
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Columna derecha: productos en cards */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o código de barras..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setProductPage(1)
                  }}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {productsQuery.isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-8 text-center text-muted-foreground">
                  Cargando productos...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No hay productos que coincidan
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
                    {pageProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={() => cart.addToCart(product)}
                        disabled={isProcessing}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end items-center gap-2 mt-4">
                    <span className="text-sm text-muted-foreground">
                      Página {safePage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProductPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
    </div>
  )
}
