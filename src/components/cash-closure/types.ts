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
 * Types specific to the Cash Closure feature
 */

export interface PaymentMethodBreakdown {
    id?: number
    cash_closure_id?: string
    payment_method_id: number
    payment_method?: {
        id: number
        name: string
    }
    payment_method_name?: string
    theoretical_amount: number | string
    theoretical_count: number
    actual_amount: number | string
    actual_count: number | null
    difference: number | string
    notes: string | null
}

export interface Denomination {
    id?: number
    cash_closure_id?: string
    denomination: number | string
    type: 'Billete' | 'Moneda'
    quantity: number
    subtotal: number | string
}

export interface TheoreticalData {
    period: {
        start: string
        end: string
    }
    theoretical: {
        total_sales: number
        total_returns: number
        net_total: number
    }
    metrics: {
        total_transactions: number
        total_customers: number
        average_ticket: number
    }
    payment_breakdown: PaymentMethodBreakdown[]
}

export interface CashClosure {
    id: string
    closure_number: number
    date: string
    start_date: string
    end_date: string
    cashier_name: string
    cashier_signature: string | null
    supervisor_name: string | null
    supervisor_signature: string | null
    supervisor_validated_at: string | null
    theoretical_total: number | string
    theoretical_sales: number | string
    theoretical_returns: number | string
    actual_total: number | string
    difference: number | string
    difference_percentage: number | string
    total_transactions: number
    total_customers: number
    average_ticket: number | string
    notes: string | null
    status: 'Pendiente' | 'Validado' | 'Cerrado'
    created_at: string
    updated_at: string
    payment_breakdowns: PaymentMethodBreakdown[]
    denominations: Denomination[]
}

export const GUATEMALAN_DENOMINATIONS: Denomination[] = [
    // Billetes
    { denomination: 200, type: 'Billete', quantity: 0, subtotal: 0 },
    { denomination: 100, type: 'Billete', quantity: 0, subtotal: 0 },
    { denomination: 50, type: 'Billete', quantity: 0, subtotal: 0 },
    { denomination: 20, type: 'Billete', quantity: 0, subtotal: 0 },
    { denomination: 10, type: 'Billete', quantity: 0, subtotal: 0 },
    { denomination: 5, type: 'Billete', quantity: 0, subtotal: 0 },
    { denomination: 1, type: 'Billete', quantity: 0, subtotal: 0 },
    // Monedas
    { denomination: 0.50, type: 'Moneda', quantity: 0, subtotal: 0 },
    { denomination: 0.25, type: 'Moneda', quantity: 0, subtotal: 0 },
    { denomination: 0.10, type: 'Moneda', quantity: 0, subtotal: 0 },
    { denomination: 0.05, type: 'Moneda', quantity: 0, subtotal: 0 },
]

/** Convert string/number to number */
export const toNumber = (value: number | string): number => {
    return typeof value === 'string' ? parseFloat(value) : value
}

/** Format currency in Quetzales */
export const formatCurrency = (amount: number | string) => {
    const numAmount = toNumber(amount)
    return `Q ${numAmount.toFixed(2)}`
}

/** Format date/time for Guatemala */
export const formatDateTime = (dateString: string) => {
    const cleanDate = dateString.replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '')
    const parts = cleanDate.replace('T', ' ').split(' ')
    const datePart = parts[0].split('-')
    const timePart = parts[1]?.split(':') || ['00', '00', '00']

    const year = datePart[0]
    const month = datePart[1]
    const day = datePart[2]
    const hour = timePart[0]
    const minute = timePart[1]

    const hourNum = parseInt(hour)
    const period = hourNum >= 12 ? 'p. m.' : 'a. m.'
    const hour12 = hourNum % 12 || 12

    return `${day}/${month}/${year}, ${String(hour12).padStart(2, '0')}:${minute} ${period}`
}
