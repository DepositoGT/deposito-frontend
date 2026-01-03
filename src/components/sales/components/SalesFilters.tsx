/**
 * SalesFilters - Filter bar for sales list
 */
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'
import { SaleStatus, PaymentMethod } from '@/types'

interface SalesFiltersProps {
    searchTerm: string
    onSearchChange: (value: string) => void
    statusFilter: SaleStatus | 'all'
    onStatusChange: (value: SaleStatus | 'all') => void
    paymentFilter: PaymentMethod | 'all'
    onPaymentChange: (value: PaymentMethod | 'all') => void
}

export const SalesFilters = ({
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusChange,
    paymentFilter,
    onPaymentChange
}: SalesFiltersProps) => {
    return (
        <Card>
            <CardContent className='p-4'>
                <div className='flex items-center space-x-4'>
                    <div className='flex-1 relative'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                        <Input
                            placeholder='Buscar por ID, cliente o NIT...'
                            value={searchTerm}
                            onChange={e => onSearchChange(e.target.value)}
                            className='pl-10'
                        />
                    </div>
                    <div className='w-48'>
                        <Select value={statusFilter} onValueChange={(v: SaleStatus | 'all') => onStatusChange(v)}>
                            <SelectTrigger><SelectValue placeholder='Estado' /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value='all'>Todos los estados</SelectItem>
                                <SelectItem value='pending'>Pendiente</SelectItem>
                                <SelectItem value='paid'>Pagado</SelectItem>
                                <SelectItem value='completed'>Completado</SelectItem>
                                <SelectItem value='cancelled'>Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className='w-48'>
                        <Select value={paymentFilter} onValueChange={(v: PaymentMethod | 'all') => onPaymentChange(v)}>
                            <SelectTrigger><SelectValue placeholder='Método de Pago' /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value='all'>Todos los métodos</SelectItem>
                                <SelectItem value='Efectivo'>Efectivo</SelectItem>
                                <SelectItem value='Tarjeta'>Tarjeta</SelectItem>
                                <SelectItem value='Transferencia'>Transferencia</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
