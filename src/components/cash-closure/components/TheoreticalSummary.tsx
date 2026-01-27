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
 * TheoreticalSummary - Display theoretical closure summary
 */
import type { TheoreticalData } from '../types'
import { formatCurrency } from '../types'

interface TheoreticalSummaryProps {
    data: TheoreticalData
}

export const TheoreticalSummary = ({ data }: TheoreticalSummaryProps) => {
    return (
        <div className="border rounded-lg p-4 bg-muted/50">
            <h3 className="font-semibold mb-3">Resumen Teórico</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <p className="text-sm text-muted-foreground">Total Teórico</p>
                    <p className="text-lg font-bold">{formatCurrency(data.theoretical.net_total)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Ventas Brutas</p>
                    <p className="text-lg font-semibold">{formatCurrency(data.theoretical.total_sales)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Devoluciones</p>
                    <p className="text-lg font-semibold text-red-600">-{formatCurrency(data.theoretical.total_returns)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Transacciones</p>
                    <p className="text-lg font-semibold">{data.metrics.total_transactions}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Clientes</p>
                    <p className="text-lg font-semibold">{data.metrics.total_customers}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                    <p className="text-lg font-semibold">{formatCurrency(data.metrics.average_ticket)}</p>
                </div>
            </div>
        </div>
    )
}
