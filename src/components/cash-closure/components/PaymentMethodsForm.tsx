/**
 * PaymentMethodsForm - Form for entering actual payment amounts
 */
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PaymentMethodBreakdown } from '../types'
import { formatCurrency, toNumber } from '../types'

interface PaymentMethodsFormProps {
    paymentBreakdown: PaymentMethodBreakdown[]
    onUpdateAmount: (index: number, field: 'actual_amount' | 'actual_count' | 'notes', value: string | number) => void
}

export const PaymentMethodsForm = ({ paymentBreakdown, onUpdateAmount }: PaymentMethodsFormProps) => {
    return (
        <div className="space-y-4">
            <h3 className="font-semibold">Desglose por Método de Pago</h3>
            {paymentBreakdown.map((item, index) => (
                <Card key={item.payment_method_id}>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium">{item.payment_method_name}</h4>
                                <Badge variant={toNumber(item.difference) === 0 ? 'default' : toNumber(item.difference) > 0 ? 'secondary' : 'destructive'}>
                                    {toNumber(item.difference) >= 0 ? '+' : ''}{formatCurrency(item.difference)}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Teórico</Label>
                                    <p className="text-lg font-semibold">{formatCurrency(item.theoretical_amount)}</p>
                                    <p className="text-sm text-muted-foreground">{item.theoretical_count} transacciones</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor={`actual-${index}`}>Monto Contado</Label>
                                    <Input
                                        id={`actual-${index}`}
                                        type="number"
                                        step="0.01"
                                        value={item.actual_amount || ''}
                                        onChange={(e) => onUpdateAmount(index, 'actual_amount', e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor={`notes-${index}`}>Notas</Label>
                                <Input
                                    id={`notes-${index}`}
                                    value={item.notes || ''}
                                    onChange={(e) => onUpdateAmount(index, 'notes', e.target.value)}
                                    placeholder="Observaciones (opcional)"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
