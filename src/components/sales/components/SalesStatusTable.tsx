/**
 * SalesStatusTable - Table displaying sales for a specific status
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { Sale, SaleStatus } from '@/types'
import { formatMoney, formatDateTime } from '@/utils'
import { SaleStatusKey, STATUS_LABELS } from '../types'

interface SalesStatusTableProps {
    statusKey: SaleStatusKey
    sales: Sale[]
    pageInfo: { page: number; totalPages: number }
    isLoading: boolean
    updatingSaleIds: Set<string>
    onPageChange: (page: number) => void
    onStatusChange: (saleId: string, newStatus: SaleStatus) => void
    onViewSale: (sale: Sale) => void
    onDeleteSale: (saleId: string) => void
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

export const SalesStatusTable = ({
    statusKey,
    sales,
    pageInfo,
    isLoading,
    updatingSaleIds,
    onPageChange,
    onStatusChange,
    onViewSale,
    onDeleteSale
}: SalesStatusTableProps) => {
    return (
        <Card className='animate-slide-up'>
            <CardHeader>
                <CardTitle className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        {getStatusBadge(statusKey as SaleStatus)}
                        <span>{STATUS_LABELS[statusKey]} ({sales.length})</span>
                    </div>
                    <div className='text-sm text-muted-foreground'>
                        {isLoading ? 'Cargando...' : `Página ${pageInfo.page}/${pageInfo.totalPages}`}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {sales.length === 0 ? (
                    <div className='text-center py-8 text-muted-foreground'>
                        No hay ventas {STATUS_LABELS[statusKey].toLowerCase()}
                    </div>
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full'>
                            <thead>
                                <tr className='border-b border-border'>
                                    <th className='text-left p-3 font-medium text-muted-foreground'>ID Venta</th>
                                    <th className='text-left p-3 font-medium text-muted-foreground'>Fecha/Hora</th>
                                    <th className='text-left p-3 font-medium text-muted-foreground'>Cliente</th>
                                    <th className='text-center p-3 font-medium text-muted-foreground'>Items</th>
                                    <th className='text-right p-3 font-medium text-muted-foreground'>Total</th>
                                    <th className='text-center p-3 font-medium text-muted-foreground'>Pago</th>
                                    <th className='text-center p-3 font-medium text-muted-foreground'>Estado</th>
                                    <th className='text-center p-3 font-medium text-muted-foreground'>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((sale, index) => (
                                    <tr
                                        key={sale.id}
                                        className='border-b border-border hover:bg-muted transition-colors animate-slide-up'
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <td className='p-3'>
                                            <div className='flex items-center gap-2'>
                                                <span className='font-medium text-primary'>{sale.id}</span>
                                                {sale.hasReturns && (
                                                    <span title='Tiene devoluciones'>
                                                        <AlertTriangle className='w-4 h-4 text-orange-500' />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className='p-3'>
                                            <div className='text-sm text-foreground'>{formatDateTime(sale.date)}</div>
                                        </td>
                                        <td className='p-3'>
                                            <div className='font-medium text-foreground'>{sale.customer}</div>
                                            <div className='text-xs text-muted-foreground'>
                                                {sale.isFinalConsumer ? 'CF' : sale.customerNit}
                                            </div>
                                        </td>
                                        <td className='p-3 text-center'>
                                            <span className='text-foreground'>{sale.items}</span>
                                        </td>
                                        <td className='p-3 text-right'>
                                            <div className='flex flex-col items-end'>
                                                {sale.hasReturns ? (
                                                    <>
                                                        <span className='font-medium text-green-700'>
                                                            {formatMoney(sale.adjustedTotal || sale.total)}
                                                        </span>
                                                        <span className='text-xs text-muted-foreground line-through'>
                                                            {formatMoney(sale.total)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className='font-medium text-foreground'>{formatMoney(sale.total)}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className='p-3 text-center'>
                                            <Badge variant='outline'>{sale.payment}</Badge>
                                        </td>
                                        <td className='p-3 text-center'>
                                            <Select
                                                value={sale.status}
                                                onValueChange={(v: SaleStatus) => onStatusChange(sale.id, v)}
                                                disabled={updatingSaleIds.has(sale.id)}
                                            >
                                                <SelectTrigger className='w-32'>
                                                    {updatingSaleIds.has(sale.id) ? '...' : getStatusBadge(sale.status)}
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value='pending'>Pendiente</SelectItem>
                                                    <SelectItem value='paid'>Pagado</SelectItem>
                                                    <SelectItem value='completed'>Completado</SelectItem>
                                                    <SelectItem value='cancelled'>Cancelado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className='p-3 text-center'>
                                            <div className='flex justify-center space-x-1'>
                                                <Button variant='ghost' size='sm' onClick={() => onViewSale(sale)}>
                                                    <Eye className='w-4 h-4' />
                                                </Button>
                                                <Button
                                                    variant='ghost'
                                                    size='sm'
                                                    className='text-destructive'
                                                    onClick={() => onDeleteSale(sale.id)}
                                                >
                                                    <Trash2 className='w-4 h-4' />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
            {/* Pagination */}
            <div className='flex justify-end items-center gap-2 p-4'>
                <span className='text-sm text-muted-foreground mr-2'>
                    Página {pageInfo.page} de {pageInfo.totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, pageInfo.page - 1))}
                    disabled={pageInfo.page <= 1}
                >
                    <ChevronLeft className='w-4 h-4' />
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(pageInfo.totalPages, pageInfo.page + 1))}
                    disabled={pageInfo.page >= pageInfo.totalPages}
                >
                    <ChevronRight className='w-4 h-4' />
                </Button>
            </div>
        </Card>
    )
}
