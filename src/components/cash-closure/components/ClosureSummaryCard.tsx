/**
 * ClosureSummaryCard - Display closure totals and difference
 */
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '../types'

interface ClosureSummaryCardProps {
    theoreticalTotal: number
    actualTotal: number
    difference: number
    differencePercentage: number
}

export const ClosureSummaryCard = ({
    theoreticalTotal,
    actualTotal,
    difference,
    differencePercentage
}: ClosureSummaryCardProps) => {
    return (
        <div className="border rounded-lg p-4 bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <p className="text-sm text-muted-foreground">Total Teórico</p>
                    <p className="text-2xl font-bold">{formatCurrency(theoreticalTotal)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Total Contado</p>
                    <p className="text-2xl font-bold">{formatCurrency(actualTotal)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Diferencia</p>
                    <div className="flex items-center gap-2">
                        <p className={`text-2xl font-bold ${difference === 0 ? 'text-green-600' : difference > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                            {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                        </p>
                        <Badge variant={difference === 0 ? 'default' : 'secondary'}>
                            {differencePercentage.toFixed(2)}%
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    )
}
