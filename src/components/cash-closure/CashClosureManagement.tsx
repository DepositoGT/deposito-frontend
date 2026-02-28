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
 * CashClosureManagement - Refactored main component
 * 
 * This component orchestrates the cash closure management feature.
 * All UI components and business logic are extracted to sub-modules.
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Calculator, FileText, User, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/useAuth'
import { useAuthPermissions } from '@/hooks/useAuthPermissions'

// Feature imports
import { useCashClosureForm, useCashClosureAPI } from './hooks'
import {
    TheoreticalSummary,
    PaymentMethodsForm,
    DenominationsCounter,
    ClosureSummaryCard,
    ClosuresHistoryList,
    ClosureDetailDialog,
    RejectClosureDialog
} from './components'
import { generateClosurePDF } from './generatePDF'
import type { CashClosure } from './types'

const CashClosureManagement = () => {
    const { toast } = useToast()
    const { user } = useAuth()
    const { hasPermission } = useAuthPermissions()

    // Hooks
    const form = useCashClosureForm()
    const api = useCashClosureAPI()

    // Permisos por tipo de cierre (configurables por rol)
    const canCreateDay = hasPermission('cashclosure.create') || hasPermission('cashclosure.create_day')
    const canCreateOwn = hasPermission('cashclosure.create') || hasPermission('cashclosure.create_own')
    const canCreateClosure = canCreateDay || canCreateOwn
    const showClosureTypeSelector = canCreateDay && canCreateOwn

    // Alcance: si solo puede uno, fijarlo; si puede ambos, elegir
    const [closureScope, setClosureScope] = useState<'day' | 'mine'>(() =>
        canCreateOwn && !canCreateDay ? 'mine' : 'day'
    )

    // Filtros del historial (solo para no sellers)
    const [historyStatus, setHistoryStatus] = useState<string>('')
    const [historyStartDate, setHistoryStartDate] = useState('')
    const [historyEndDate, setHistoryEndDate] = useState('')

    // Dialog states
    const [selectedClosure, setSelectedClosure] = useState<CashClosure | null>(null)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [supervisorName] = useState(user?.name || user?.email || '')
    const [showConfirmSaveDialog, setShowConfirmSaveDialog] = useState(false)

    // Load closures on mount and when filters change
    useEffect(() => {
        const filters = (historyStatus || historyStartDate || historyEndDate)
            ? { status: historyStatus || undefined, startDate: historyStartDate || undefined, endDate: historyEndDate || undefined }
            : undefined
        api.fetchClosures(1, form.isSeller, undefined, filters)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyStatus, historyStartDate, historyEndDate])

    const effectiveScope = showClosureTypeSelector ? closureScope : (canCreateDay ? 'day' : 'mine')

    // Sugerir período desde último cierre (según alcance) hasta fin del día
    useEffect(() => {
        api.getLastClosureDate(effectiveScope).then((result) => {
            if (result?.suggestedStart && result?.suggestedEnd) {
                form.setStartDate(result.suggestedStart)
                form.setEndDate(result.suggestedEnd)
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveScope])

    // Handlers
    const handleCalculateTheoretical = async () => {
        const cashierId = effectiveScope === 'mine' ? (user?.id ?? undefined) : undefined
        const data = await api.calculateTheoretical(form.startDate, form.endDate, cashierId)
        if (data) {
            form.initializeFromTheoretical(data)
        }
    }

    const performSaveClosure = async () => {
        if (!api.theoreticalData) return false
        const success = await api.saveClosure({
            startDate: form.startDate,
            endDate: form.endDate,
            cashierName: form.cashierName,
            cashierId: user?.id,
            theoreticalData: api.theoreticalData,
            actualTotal: form.getActualTotal(),
            notes: form.notes,
            paymentBreakdown: form.paymentBreakdown,
            denominations: form.denominations
        })
        if (success) {
            form.resetForm()
            const f = historyStatus || historyStartDate || historyEndDate ? { status: historyStatus || undefined, startDate: historyStartDate || undefined, endDate: historyEndDate || undefined } : undefined
            api.fetchClosures(1, form.isSeller, undefined, f)
        }
        return success
    }

    const handleSaveClosure = async () => {
        if (!api.theoreticalData) {
            toast({ title: 'Error', description: 'Primero debes calcular el cierre teórico', variant: 'destructive' })
            return
        }

        const theoreticalTotal = api.theoreticalData.theoretical.net_total
        const difference = form.getTotalDifference(theoreticalTotal)
        const differencePct = form.getDifferencePercentage(theoreticalTotal)
        const isLargeDifference = theoreticalTotal > 0 && (Math.abs(differencePct) > 5 || Math.abs(difference) > 100)

        if (isLargeDifference) {
            setShowConfirmSaveDialog(true)
            return
        }

        await performSaveClosure()
    }

    const handleConfirmSaveWithLargeDifference = async () => {
        setShowConfirmSaveDialog(false)
        await performSaveClosure()
    }

    const handleViewClosure = async (closureId: string) => {
        const closure = await api.fetchClosureDetail(closureId)
        if (closure) {
            setSelectedClosure(closure)
            setIsViewDialogOpen(true)
        }
    }

    const handleApproveClosure = async () => {
        if (!selectedClosure) return
        const updated = await api.approveClosure(selectedClosure.id, supervisorName)
        if (updated) {
            setSelectedClosure(updated)
            const f = historyStatus || historyStartDate || historyEndDate ? { status: historyStatus || undefined, startDate: historyStartDate || undefined, endDate: historyEndDate || undefined } : undefined
            api.fetchClosures(api.currentPage, form.isSeller, undefined, f)
        }
    }

    const handleRejectClosure = async () => {
        if (!selectedClosure || !rejectionReason.trim()) {
            toast({ title: 'Error', description: 'Debes proporcionar una razón', variant: 'destructive' })
            return
        }
        const updated = await api.rejectClosure(selectedClosure.id, rejectionReason)
        if (updated) {
            setSelectedClosure(updated)
            setIsRejectDialogOpen(false)
            setRejectionReason('')
            const f = historyStatus || historyStartDate || historyEndDate ? { status: historyStatus || undefined, startDate: historyStartDate || undefined, endDate: historyEndDate || undefined } : undefined
            api.fetchClosures(api.currentPage, form.isSeller, undefined, f)
        }
    }

    const handleDownloadPDF = () => {
        if (selectedClosure) {
            generateClosurePDF(selectedClosure)
            toast({ title: 'PDF Generado', description: `Cierre #${selectedClosure.closure_number} descargado` })
        }
    }

    // Check if cash payment method exists
    const hasCashPayment = form.paymentBreakdown.some(
        p => p.payment_method_name?.toLowerCase().includes('efectivo')
    )

    const canViewHistory = hasPermission('cashclosure.view')

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Cierre de Caja</h2>
                    <p className="text-muted-foreground">Registra y aprueba cierres por período y cajero.</p>
                </div>
            </div>

            {/* Nuevo cierre - mismo estilo que Filtros / Cards del ERP */}
            {canCreateClosure && (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Calculator className="h-5 w-5" />
                        Nuevo Cierre de Caja
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Pasos: 1. Período → 2. Calcular → 3. Contado → 4. Guardar
                    </p>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">Paso 1 — Período</h4>
                        <div className="bg-muted/50 border rounded-lg p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Fecha</p>
                                    <p className="text-sm font-medium">
                                        {new Date().toLocaleDateString('es-GT', {
                                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Horario del período</p>
                                    <p className="text-sm font-medium tabular-nums">
                                        {form.startDate && form.endDate ? (
                                            <>{form.startDate.split('T')[1]?.substring(0, 8) || '00:00:00'} — {form.endDate.split('T')[1]?.substring(0, 8) || '23:59:59'}</>
                                        ) : 'Cargando...'}
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                                Desde el fin del último cierre hasta las 23:59:59 de hoy.
                            </p>
                        </div>
                        {showClosureTypeSelector && (
                            <div className="space-y-2">
                                <Label>Tipo de cierre</Label>
                                <Select value={closureScope} onValueChange={(v: 'day' | 'mine') => setClosureScope(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {canCreateDay && (
                                            <SelectItem value="day">Cierre del día (todos los cajeros)</SelectItem>
                                        )}
                                        {canCreateOwn && (
                                            <SelectItem value="mine">Mi cierre (solo mis ventas)</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {!showClosureTypeSelector && (
                            <p className="text-sm text-muted-foreground">
                                {effectiveScope === 'day' ? 'Generando: Cierre del día (todos los cajeros).' : 'Generando: Mi cierre (solo mis ventas).'}
                            </p>
                        )}
                        <Button
                            onClick={handleCalculateTheoretical}
                            disabled={api.isCalculating}
                            className="w-full bg-liquor-amber hover:bg-liquor-amber/90 text-white"
                        >
                            <Calculator className="h-4 w-4 mr-2" />
                            {api.isCalculating
                                ? 'Calculando...'
                                : effectiveScope === 'mine'
                                    ? 'Calcular mi cierre'
                                    : 'Calcular cierre del día'}
                        </Button>
                    </div>

                    {/* Pasos 2-4: solo después de calcular */}
                    {api.theoreticalData && (
                        <>
                            <TheoreticalSummary data={api.theoreticalData} />

                            <div className="space-y-3 pt-4 border-t">
                                <h4 className="text-sm font-medium text-foreground">Paso 3 — Montos contados</h4>
                                <PaymentMethodsForm
                                    paymentBreakdown={form.paymentBreakdown}
                                    onUpdateAmount={form.updateActualAmount}
                                />
                                {hasCashPayment && (
                                    <DenominationsCounter
                                        denominations={form.denominations}
                                        onUpdateQuantity={form.updateDenomination}
                                        cashTotal={form.getCashTotal()}
                                    />
                                )}
                            </div>

                            <ClosureSummaryCard
                                theoreticalTotal={api.theoreticalData.theoretical.net_total}
                                actualTotal={form.getActualTotal()}
                                difference={form.getTotalDifference(api.theoreticalData.theoretical.net_total)}
                                differencePercentage={form.getDifferencePercentage(api.theoreticalData.theoretical.net_total)}
                            />

                            <div className="border rounded-lg p-4 bg-muted/50">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Cajero</p>
                                        <p className="font-medium">{form.cashierName}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas (opcional)</Label>
                                <Textarea
                                    id="notes"
                                    value={form.notes}
                                    onChange={(e) => form.setNotes(e.target.value)}
                                    placeholder="Observaciones del cierre..."
                                    rows={3}
                                />
                            </div>

                            <Button
                                onClick={handleSaveClosure}
                                disabled={api.isSaving}
                                className="w-full bg-liquor-amber hover:bg-liquor-amber/90 text-white"
                                size="lg"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {api.isSaving ? 'Guardando...' : 'Guardar Cierre de Caja'}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
            )}

            {/* Closures History */}
            {canViewHistory && (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5" />
                        {form.isSeller ? 'Último Cierre de Caja' : 'Historial de Cierres'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {!form.isSeller && (
                            <>
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Estado</Label>
                                        <Select value={historyStatus || 'all'} onValueChange={(v) => setHistoryStatus(v === 'all' ? '' : v)}>
                                            <SelectTrigger className="w-[140px] h-9">
                                                <SelectValue placeholder="Todos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos</SelectItem>
                                                <SelectItem value="Pendiente">Pendiente</SelectItem>
                                                <SelectItem value="Aprobado">Aprobado</SelectItem>
                                                <SelectItem value="Rechazado">Rechazado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Desde</Label>
                                        <input
                                            type="date"
                                            className="flex h-9 w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                            value={historyStartDate}
                                            onChange={(e) => setHistoryStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Hasta</Label>
                                        <input
                                            type="date"
                                            className="flex h-9 w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                            value={historyEndDate}
                                            onChange={(e) => setHistoryEndDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Por página:</span>
                                        <Select
                                            value={String(api.pageSize)}
                                            onValueChange={(v) => {
                                                const n = Number(v)
                                                api.setPageSize(n)
                                                const f = historyStatus || historyStartDate || historyEndDate ? { status: historyStatus || undefined, startDate: historyStartDate || undefined, endDate: historyEndDate || undefined } : undefined
                                                api.fetchClosures(1, form.isSeller, n, f)
                                            }}
                                        >
                                            <SelectTrigger className="w-[72px] h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[5, 10, 25, 50, 100].map((num) => (
                                                    <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        )}
                        <ClosuresHistoryList
                            closures={api.closures}
                            isLoading={api.isLoadingClosures}
                            isSeller={form.isSeller}
                            currentPage={api.currentPage}
                            totalPages={api.totalPages}
                            onViewClosure={handleViewClosure}
                            onPageChange={(page) => {
                                const f = historyStatus || historyStartDate || historyEndDate ? { status: historyStatus || undefined, startDate: historyStartDate || undefined, endDate: historyEndDate || undefined } : undefined
                                api.fetchClosures(page, form.isSeller, undefined, f)
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
            )}

            {/* Dialogs */}
            <ClosureDetailDialog
                open={isViewDialogOpen}
                onOpenChange={setIsViewDialogOpen}
                closure={selectedClosure}
                isSeller={form.isSeller}
                onApprove={handleApproveClosure}
                onReject={() => setIsRejectDialogOpen(true)}
                onDownloadPDF={handleDownloadPDF}
            />

            <RejectClosureDialog
                open={isRejectDialogOpen}
                onOpenChange={setIsRejectDialogOpen}
                reason={rejectionReason}
                onReasonChange={setRejectionReason}
                onConfirm={handleRejectClosure}
            />

            <AlertDialog open={showConfirmSaveDialog} onOpenChange={setShowConfirmSaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Diferencia significativa</AlertDialogTitle>
                        <AlertDialogDescription>
                            La diferencia entre el total contado y el teórico es grande
                            {api.theoreticalData && (
                                <>
                                    {' '}
                                    ({form.getTotalDifference(api.theoreticalData.theoretical.net_total) >= 0 ? '+' : ''}
                                    Q {form.getTotalDifference(api.theoreticalData.theoretical.net_total).toFixed(2)} /{' '}
                                    {form.getDifferencePercentage(api.theoreticalData.theoretical.net_total).toFixed(1)}%).
                                </>
                            )}
                            {' '}
                            ¿Deseas guardar el cierre de todas formas?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleConfirmSaveWithLargeDifference()}>
                            Sí, guardar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default CashClosureManagement
