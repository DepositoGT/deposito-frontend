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
 * useCashClosureAPI - Hook for cash closure API operations
 */
import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { getApiBaseUrl } from '@/services/api'
import type { CashClosure, TheoreticalData, PaymentMethodBreakdown, Denomination } from '../types'

// Use centralized API URL
const API_URL = getApiBaseUrl()

interface FetchClosuresResponse {
    closures: CashClosure[]
    currentPage: number
    totalPages: number
}

interface SaveClosurePayload {
    startDate: string
    endDate: string
    cashierName: string
    theoreticalData: TheoreticalData
    actualTotal: number
    notes: string
    paymentBreakdown: PaymentMethodBreakdown[]
    denominations: Denomination[]
}

interface UseCashClosureAPIReturn {
    // Loading states
    isCalculating: boolean
    isSaving: boolean
    isLoadingClosures: boolean
    // Data
    theoreticalData: TheoreticalData | null
    closures: CashClosure[]
    currentPage: number
    totalPages: number
    // Operations
    calculateTheoretical: (startDate: string, endDate: string) => Promise<TheoreticalData | null>
    saveClosure: (payload: SaveClosurePayload) => Promise<boolean>
    fetchClosures: (page: number, isSeller: boolean) => Promise<void>
    fetchClosureDetail: (closureId: string) => Promise<CashClosure | null>
    approveClosure: (closureId: string, supervisorName: string) => Promise<CashClosure | null>
    rejectClosure: (closureId: string, reason: string) => Promise<CashClosure | null>
}

export const useCashClosureAPI = (): UseCashClosureAPIReturn => {
    const { toast } = useToast()

    const [isCalculating, setIsCalculating] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isLoadingClosures, setIsLoadingClosures] = useState(false)
    const [theoreticalData, setTheoreticalData] = useState<TheoreticalData | null>(null)
    const [closures, setClosures] = useState<CashClosure[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    })

    const calculateTheoretical = useCallback(async (startDate: string, endDate: string): Promise<TheoreticalData | null> => {
        setIsCalculating(true)
        try {
            // Validate stocks first
            const validateResponse = await fetch(`${API_URL}/cash-closures/validate-stocks`, {
                headers: getAuthHeaders()
            })

            if (!validateResponse.ok) throw new Error('Error validating stocks')

            const validationData = await validateResponse.json()

            if (!validationData.valid && validationData.products.length > 0) {
                toast({
                    title: 'Stock Negativo Detectado',
                    description: `Hay ${validationData.negative_stock_count} producto(s) con stock negativo.`,
                    variant: 'destructive'
                })
                return null
            }

            const response = await fetch(
                `${API_URL}/cash-closures/calculate-theoretical?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
                { headers: getAuthHeaders() }
            )

            if (!response.ok) throw new Error('Error calculating theoretical data')

            const data: TheoreticalData = await response.json()
            setTheoreticalData(data)

            toast({
                title: 'Cálculo completado',
                description: `Total teórico: Q ${data.theoretical.net_total.toFixed(2)}`,
            })

            return data
        } catch (error) {
            console.error('Error calculating theoretical:', error)
            toast({
                title: 'Error',
                description: 'No se pudo calcular el cierre teórico',
                variant: 'destructive'
            })
            return null
        } finally {
            setIsCalculating(false)
        }
    }, [toast])

    const saveClosure = useCallback(async (payload: SaveClosurePayload): Promise<boolean> => {
        setIsSaving(true)
        try {
            const closureData = {
                startDate: payload.startDate,
                endDate: payload.endDate,
                cashierName: payload.cashierName,
                cashierSignature: null,
                supervisorName: null,
                supervisorSignature: null,
                theoreticalTotal: payload.theoreticalData.theoretical.net_total,
                theoreticalSales: payload.theoreticalData.theoretical.total_sales,
                theoreticalReturns: payload.theoreticalData.theoretical.total_returns,
                actualTotal: payload.actualTotal,
                totalTransactions: payload.theoreticalData.metrics.total_transactions,
                totalCustomers: payload.theoreticalData.metrics.total_customers,
                averageTicket: payload.theoreticalData.metrics.average_ticket,
                notes: payload.notes.trim() || null,
                paymentBreakdowns: payload.paymentBreakdown,
                denominations: payload.denominations.filter(d => d.quantity > 0)
            }

            const response = await fetch(`${API_URL}/cash-closures`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(closureData)
            })

            if (!response.ok) throw new Error(`Error saving closure: ${response.status}`)

            const savedClosure = await response.json()

            toast({
                title: 'Cierre guardado',
                description: `Cierre #${savedClosure.closure_number} guardado exitosamente`,
            })

            setTheoreticalData(null)
            return true
        } catch (error) {
            console.error('Error saving closure:', error)
            toast({
                title: 'Error',
                description: 'No se pudo guardar el cierre de caja',
                variant: 'destructive'
            })
            return false
        } finally {
            setIsSaving(false)
        }
    }, [toast])

    const fetchClosures = useCallback(async (page: number, isSeller: boolean): Promise<void> => {
        setIsLoadingClosures(true)
        try {
            const pageSize = isSeller ? 1 : 10
            const response = await fetch(`${API_URL}/cash-closures?page=${page}&pageSize=${pageSize}`, {
                headers: getAuthHeaders()
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

            const data = await response.json()

            if (data && Array.isArray(data.items)) {
                setClosures(data.items)
                setCurrentPage(data.page || 1)
                setTotalPages(data.totalPages || 1)
            } else {
                setClosures([])
                setCurrentPage(1)
                setTotalPages(1)
            }
        } catch (error) {
            console.error('Error fetching closures:', error)
            setClosures([])
            toast({
                title: 'Error',
                description: 'No se pudieron cargar los cierres de caja',
                variant: 'destructive'
            })
        } finally {
            setIsLoadingClosures(false)
        }
    }, [toast])

    const fetchClosureDetail = useCallback(async (closureId: string): Promise<CashClosure | null> => {
        try {
            const response = await fetch(`${API_URL}/cash-closures/${closureId}`, {
                headers: getAuthHeaders()
            })
            return await response.json()
        } catch (error) {
            console.error('Error fetching closure detail:', error)
            toast({
                title: 'Error',
                description: 'No se pudo cargar el detalle del cierre',
                variant: 'destructive'
            })
            return null
        }
    }, [toast])

    const approveClosure = useCallback(async (closureId: string, supervisorName: string): Promise<CashClosure | null> => {
        try {
            const response = await fetch(`${API_URL}/cash-closures/${closureId}/status`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status: 'Aprobado', supervisor_name: supervisorName })
            })

            if (!response.ok) throw new Error('Error al aprobar el cierre')

            const updatedClosure = await response.json()
            toast({ title: 'Cierre Aprobado' })
            return updatedClosure
        } catch (error) {
            console.error('Error approving closure:', error)
            toast({ title: 'Error', description: 'No se pudo aprobar el cierre', variant: 'destructive' })
            return null
        }
    }, [toast])

    const rejectClosure = useCallback(async (closureId: string, reason: string): Promise<CashClosure | null> => {
        try {
            const response = await fetch(`${API_URL}/cash-closures/${closureId}/status`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status: 'Rechazado', rejection_reason: reason })
            })

            if (!response.ok) throw new Error('Error al rechazar el cierre')

            const updatedClosure = await response.json()
            toast({ title: 'Cierre Rechazado', variant: 'destructive' })
            return updatedClosure
        } catch (error) {
            console.error('Error rejecting closure:', error)
            toast({ title: 'Error', description: 'No se pudo rechazar el cierre', variant: 'destructive' })
            return null
        }
    }, [toast])

    return {
        isCalculating,
        isSaving,
        isLoadingClosures,
        theoreticalData,
        closures,
        currentPage,
        totalPages,
        calculateTheoretical,
        saveClosure,
        fetchClosures,
        fetchClosureDetail,
        approveClosure,
        rejectClosure
    }
}
