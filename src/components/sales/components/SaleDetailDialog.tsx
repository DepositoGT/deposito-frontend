/**
 * SaleDetailDialog - Dialog for viewing sale details with returns
 */
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, PackageX, RotateCcw } from 'lucide-react'
import { Sale, SaleStatus } from '@/types'
import { formatMoney, formatDateTime } from '@/utils'
import { useNavigate } from 'react-router-dom'

interface SaleDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sale: Sale | null
}

const getStatusBadge = (status: SaleStatus) => {
    const badges: Record<string, React.ReactNode> = {
        pending: <Badge className='bg-yellow-500 text-white'>Pendiente</Badge>,
        paid: <Badge className='bg-blue-500 text-white'>Pagado</Badge>,
        completed: <Badge className='bg-green-500 text-white'>Completado</Badge>,
        cancelled: <Badge variant='destructive'>Cancelado</Badge>,
    }
    return badges[status] || <Badge variant='outline'>Desconocido</Badge>
}

export const SaleDetailDialog = ({
    open,
    onOpenChange,
    sale
}: SaleDetailDialogProps) => {
    const navigate = useNavigate()

    if (!sale) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-3xl max-h-[90vh] overflow-hidden flex flex-col'>
                <DialogHeader>
                    <DialogTitle>Detalle de Venta {sale.id}</DialogTitle>
                </DialogHeader>
                <div className='space-y-4 overflow-y-auto pr-2'>
                    {/* Basic Info */}
                    <div className='grid grid-cols-2 gap-4'>
                        <div><Label>Cliente</Label><div className='font-medium'>{sale.customer}</div></div>
                        <div><Label>NIT / Tipo</Label><div className='font-medium'>{sale.isFinalConsumer ? 'Consumidor Final' : sale.customerNit}</div></div>
                        <div><Label>Fecha</Label><div className='font-medium'>{formatDateTime(sale.date)}</div></div>
                        <div><Label>Método de Pago</Label><div className='font-medium'>{sale.payment}</div></div>
                        <div><Label>Estado</Label><div>{getStatusBadge(sale.status)}</div></div>
                    </div>

                    {/* Returns Alert */}
                    {sale.hasReturns && (
                        <div className='bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-3'>
                            <AlertTriangle className='w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5' />
                            <div>
                                <p className='text-sm font-medium text-orange-900'>Esta venta tiene devoluciones</p>
                                <p className='text-xs text-orange-700 mt-1'>
                                    Se han devuelto productos por un valor de {formatMoney(sale.totalReturned || 0)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Products */}
                    <div>
                        <Label>Productos</Label>
                        <div className='border rounded-lg divide-y max-h-64 overflow-y-auto'>
                            {sale.products.map((p, i) => (
                                <div key={i} className='p-3 flex justify-between'>
                                    <div>
                                        <div className='font-medium'>{p.name}</div>
                                        <div className='text-sm text-muted-foreground'>Cantidad: {p.qty}</div>
                                    </div>
                                    <div className='text-right'>
                                        <div className='font-medium'>Q {(p.price * p.qty).toFixed(2)}</div>
                                        <div className='text-sm text-muted-foreground'>Q {p.price.toFixed(2)} c/u</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Returns Section */}
                    {sale.hasReturns && sale.returnDetails && sale.returnDetails.length > 0 && (
                        <div>
                            <Label className='flex items-center gap-2'>
                                <PackageX className='w-4 h-4 text-orange-600' />Devoluciones
                            </Label>
                            <div className='border border-orange-200 rounded-lg divide-y mt-2 bg-orange-50/30'>
                                {sale.returnDetails.map((ret, idx) => (
                                    <div key={idx} className='p-3 space-y-2'>
                                        <div className='flex justify-between items-start'>
                                            <div>
                                                <div className='text-sm font-medium text-orange-900'>Devolución {idx + 1}</div>
                                                <div className='text-xs text-muted-foreground'>{formatDateTime(ret.date)}</div>
                                            </div>
                                            <Badge variant={ret.status === 'Completada' ? 'default' : 'secondary'} className='text-xs'>
                                                {ret.status}
                                            </Badge>
                                        </div>
                                        {ret.reason && (
                                            <div className='text-xs text-muted-foreground italic'>Razón: {ret.reason}</div>
                                        )}
                                        <div className='space-y-1'>
                                            {ret.items.map((item, itemIdx) => (
                                                <div key={itemIdx} className='flex justify-between text-xs bg-white/50 p-2 rounded'>
                                                    <span>{item.productName} × {item.qty}</span>
                                                    <span className='font-medium text-orange-700'>-{formatMoney(item.refund)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className='text-right text-sm font-bold text-orange-900 border-t pt-1'>
                                            Total devuelto: {formatMoney(ret.totalRefund)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Totals */}
                    <div className='bg-muted/50 p-4 rounded-lg space-y-2'>
                        <div className='flex justify-between'>
                            <span>Subtotal Original:</span>
                            <span>{formatMoney(sale.total)}</span>
                        </div>
                        {sale.hasReturns && (
                            <>
                                <div className='flex justify-between text-orange-700'>
                                    <span>(-) Devoluciones:</span>
                                    <span>-{formatMoney(sale.totalReturned || 0)}</span>
                                </div>
                                <div className='flex justify-between text-lg font-bold border-t pt-2 text-green-700'>
                                    <span>Total Neto:</span>
                                    <span>{formatMoney(sale.adjustedTotal || sale.total)}</span>
                                </div>
                            </>
                        )}
                        {sale.payment === 'Efectivo' && (
                            <>
                                <div className='flex justify-between'>
                                    <span>Monto Recibido:</span>
                                    <span>{formatMoney(sale.amountReceived)}</span>
                                </div>
                                <div className='flex justify-between font-bold'>
                                    <span>Vuelto:</span>
                                    <span>{formatMoney(sale.change)}</span>
                                </div>
                            </>
                        )}
                        {!sale.hasReturns && (
                            <div className='flex justify-between text-lg font-bold border-t pt-2'>
                                <span>Total:</span>
                                <span>{formatMoney(sale.total)}</span>
                            </div>
                        )}
                    </div>

                    {/* Return Button */}
                    {sale.status === 'completed' && (
                        <div className='pt-4 border-t'>
                            <Button
                                variant='outline'
                                className='w-full text-orange-600 border-orange-300 hover:bg-orange-50'
                                onClick={() => {
                                    onOpenChange(false)
                                    navigate(`/returns/new?sale_id=${sale.id}`)
                                }}
                            >
                                <RotateCcw className='w-4 h-4 mr-2' />Procesar Devolución
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
