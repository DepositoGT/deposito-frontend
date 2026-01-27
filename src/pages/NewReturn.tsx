import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Minus, Plus, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCreateReturn } from '@/hooks/useReturns'
import { fetchSaleById, Sale, SaleItem } from '@/services/saleService'
import { formatMoney, formatDateTime } from '@/utils'

interface ReturnItem {
  sale_item_id: number
  product_id: string
  product_name: string
  original_qty: number
  qty_returned: number
  price: number
  reason: string
}

const NewReturn = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const saleId = searchParams.get('sale_id')

  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [generalReason, setGeneralReason] = useState('')
  const [notes, setNotes] = useState('')

  const createReturnMutation = useCreateReturn()

  useEffect(() => {
    if (!saleId) {
      toast({
        title: 'Error',
        description: 'No se especificó ID de venta',
        variant: 'destructive'
      })
      navigate('/')
      return
    }

    loadSale()
  }, [saleId])

  const loadSale = async () => {
    if (!saleId) return

    try {
      setLoading(true)
      const saleData = await fetchSaleById(saleId)

      if (saleData.status.name !== 'Completada') {
        toast({
          title: 'Error',
          description: 'Solo se pueden procesar devoluciones de ventas completadas',
          variant: 'destructive'
        })
        navigate('/')
        return
      }

      setSale(saleData)

      // Initialize return items with all products from sale
      const initialItems: ReturnItem[] = saleData.sale_items.map(item => ({
        sale_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product.name,
        original_qty: item.qty,
        qty_returned: 0,
        price: Number(item.price),
        reason: ''
      }))

      setReturnItems(initialItems)
    } catch (error) {
      toast({
        title: 'Error al cargar venta',
        description: (error as Error).message,
        variant: 'destructive'
      })
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const updateReturnQty = (index: number, delta: number) => {
    setReturnItems(items => {
      const newItems = [...items]
      const item = newItems[index]
      const newQty = Math.max(0, Math.min(item.original_qty, item.qty_returned + delta))
      newItems[index] = { ...item, qty_returned: newQty }
      return newItems
    })
  }

  const updateItemReason = (index: number, reason: string) => {
    setReturnItems(items => {
      const newItems = [...items]
      newItems[index] = { ...newItems[index], reason }
      return newItems
    })
  }

  const calculateTotalRefund = () => {
    return returnItems.reduce((total, item) => {
      return total + (item.qty_returned * item.price)
    }, 0)
  }

  const selectAllProducts = () => {
    setReturnItems(items =>
      items.map(item => ({ ...item, qty_returned: item.original_qty }))
    )
  }

  const clearSelection = () => {
    setReturnItems(items =>
      items.map(item => ({ ...item, qty_returned: 0 }))
    )
  }

  const handleSubmit = async () => {
    // Validate at least one item has qty > 0
    const itemsToReturn = returnItems.filter(item => item.qty_returned > 0)

    if (itemsToReturn.length === 0) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar al menos un producto para devolver',
        variant: 'destructive'
      })
      return
    }

    if (!generalReason.trim()) {
      toast({
        title: 'Error',
        description: 'Debes especificar una razón para la devolución',
        variant: 'destructive'
      })
      return
    }

    try {
      await createReturnMutation.mutateAsync({
        sale_id: saleId!,
        reason: generalReason,
        notes: notes || undefined,
        items: itemsToReturn.map(item => ({
          sale_item_id: item.sale_item_id,
          product_id: item.product_id,
          qty_returned: item.qty_returned,
          reason: item.reason || undefined
        }))
      })

      toast({
        title: 'Devolución creada',
        description: 'La devolución ha sido registrada exitosamente',
        variant: 'default'
      })

      navigate('/')
    } catch (error) {
      toast({
        title: 'Error al crear devolución',
        description: (error as Error).message,
        variant: 'destructive'
      })
    }
  }



  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Cargando información de la venta...</div>
      </div>
    )
  }

  if (!sale) {
    return null
  }

  const totalRefund = calculateTotalRefund()
  const hasItemsToReturn = returnItems.some(item => item.qty_returned > 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Ventas
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Procesar Devolución</h2>
          <p className="text-muted-foreground">Venta: {sale.id}</p>
        </div>
      </div>

      {/* Sale Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Venta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground">Cliente</Label>
              <div className="font-medium">{sale.customer || 'N/A'}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Fecha de Venta</Label>
              <div>{formatDateTime(sale.date)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Método de Pago</Label>
              <div>{sale.payment_method.name}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Total Venta</Label>
              <div className="font-bold">{formatMoney(Number(sale.total))}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Seleccionar Productos a Devolver</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllProducts}
              className="text-xs"
            >
              Seleccionar Todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="text-xs"
            >
              Limpiar Selección
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {returnItems.map((item, index) => (
            <div key={item.sale_item_id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Cantidad vendida: {item.original_qty} | Precio unitario: {formatMoney(item.price)}
                  </div>
                </div>
                <Badge variant={item.qty_returned > 0 ? 'default' : 'outline'}>
                  Devolver: {item.qty_returned}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateReturnQty(index, -1)}
                    disabled={item.qty_returned === 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    max={item.original_qty}
                    value={item.qty_returned}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0
                      const clamped = Math.max(0, Math.min(item.original_qty, val))
                      setReturnItems(items => {
                        const newItems = [...items]
                        newItems[index] = { ...newItems[index], qty_returned: clamped }
                        return newItems
                      })
                    }}
                    className="w-20 text-center"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateReturnQty(index, 1)}
                    disabled={item.qty_returned >= item.original_qty}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1">
                  <Input
                    placeholder="Razón específica (opcional)"
                    value={item.reason}
                    onChange={(e) => updateItemReason(index, e.target.value)}
                    disabled={item.qty_returned === 0}
                  />
                </div>

                <div className="text-right font-medium min-w-[100px]">
                  {formatMoney(item.qty_returned * item.price)}
                </div>
              </div>
            </div>
          ))}

          {!hasItemsToReturn && (
            <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-lg">
              <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No hay productos seleccionados</p>
              <p className="text-sm mt-1">
                Usa los botones +/- o "Seleccionar Todos" para elegir qué productos devolver
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Devolución</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Razón General de la Devolución *</Label>
            <Textarea
              placeholder="Ej: Producto defectuoso, cliente insatisfecho, error en el pedido..."
              value={generalReason}
              onChange={(e) => setGeneralReason(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label>Notas Adicionales (opcional)</Label>
            <Textarea
              placeholder="Información adicional relevante..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total a Reembolsar:</span>
              <span className="text-2xl">{formatMoney(totalRefund)}</span>
            </div>
            {hasItemsToReturn && (
              <div className="text-sm text-muted-foreground mt-2">
                {returnItems.filter(i => i.qty_returned > 0).length} producto(s) seleccionado(s)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={() => navigate('/sales')}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!hasItemsToReturn || !generalReason.trim() || createReturnMutation.isPending}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {createReturnMutation.isPending ? 'Procesando...' : 'Crear Devolución'}
        </Button>
      </div>
    </div>
  )
}

export default NewReturn
