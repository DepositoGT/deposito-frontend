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
import { useState, useEffect, useRef } from 'react'
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
import { useSystemSettings } from '@/hooks/useSystemSettings'

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
import { readListUiPersisted } from '@/hooks/usePersistedListUiState'
import { fetchCashSessionCurrent, sessionOpenedAtToLocalInput } from '@/services/cashSessionsService'
import type { CashRegisterDto, CashRegisterSessionDto } from '@/services/cashSessionsService'

function endOfTodayLocalDateTime(timeZone: string): string {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')}T23:59:59`
}

const CashClosureManagement = () => {
    const { toast } = useToast()
    const { user } = useAuth()
    const { hasPermission } = useAuthPermissions()
    const { companyName, currencyCode, locale, cashClosureMaxDiffPct, timezone } = useSystemSettings()

    const form = useCashClosureForm()
    const api = useCashClosureAPI()

    // Permisos por tipo de cierre (configurables por rol)
    const canCreateDay = hasPermission('cashclosure.create') || hasPermission('cashclosure.create_day')
    const canCreateOwn = hasPermission('cashclosure.create') || hasPermission('cashclosure.create_own')
    const canCreateClosure = canCreateDay || canCreateOwn
    const showClosureTypeSelector = canCreateDay && canCreateOwn

    // Alcance: por defecto «mi cierre» (turno en caja); cierre del día solo si el rol lo permite
    const [closureScope, setClosureScope] = useState<'day' | 'mine'>(() =>
        canCreateDay && !canCreateOwn ? 'day' : 'mine'
    )

    const effectiveScope = showClosureTypeSelector ? closureScope : (canCreateDay ? 'day' : 'mine')

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

    const historyFilterSigRef = useRef<string | null>(null)
    const historyFirstLoadRef = useRef(true)
    const mineClosureReqRef = useRef(0)

    type MineClosureReason =
        | 'ok'
        | 'loading'
        | 'register-open-own'
        | 'register-open-other'
        | 'no-pending'
        | 'error'

    /** «Mi cierre»: no calcular con caja abierta; solo turno ya cerrado en POS y pendiente de arqueo. */
    const [mineClosureGate, setMineClosureGate] = useState<{
        loading: boolean
        canCalculate: boolean
        reason: MineClosureReason
        errorMessage: string | null
        closableSessionId: string | null
        register: CashRegisterDto | null
        openSession: CashRegisterSessionDto | null
        closableSession: CashRegisterSessionDto | null
    }>({
        loading: true,
        canCalculate: false,
        reason: 'loading',
        errorMessage: null,
        closableSessionId: null,
        register: null,
        openSession: null,
        closableSession: null,
    })

    const refreshMineClosureGate = () => {
        const reqId = ++mineClosureReqRef.current
        if (effectiveScope !== 'mine' || !user?.id) {
            setMineClosureGate({
                loading: false,
                canCalculate: true,
                reason: 'ok',
                errorMessage: null,
                closableSessionId: null,
                register: null,
                openSession: null,
                closableSession: null,
            })
            return
        }
        setMineClosureGate((prev) => ({
            ...prev,
            loading: true,
            canCalculate: false,
            reason: 'loading',
            errorMessage: null,
        }))
        void fetchCashSessionCurrent().then((r) => {
            if (reqId !== mineClosureReqRef.current) return
            if (!r.ok) {
                setMineClosureGate({
                    loading: false,
                    canCalculate: false,
                    reason: 'error',
                    errorMessage: r.message || 'No se pudo verificar el turno',
                    closableSessionId: null,
                    register: null,
                    openSession: null,
                    closableSession: null,
                })
                return
            }

            const register = r.register
            const open = r.session?.status === 'OPEN' ? r.session : null
            const closableRaw = r.closableSession
            const closable =
                closableRaw &&
                closableRaw.status === 'CLOSED' &&
                (closableRaw.cash_closure_id == null || closableRaw.cash_closure_id === '')
                    ? closableRaw
                    : null

            if (open) {
                const own = String(open.opened_by_id) === String(user.id)
                setMineClosureGate({
                    loading: false,
                    canCalculate: false,
                    reason: own ? 'register-open-own' : 'register-open-other',
                    errorMessage: null,
                    closableSessionId: null,
                    register,
                    openSession: open,
                    closableSession: closable,
                })
                if (own) {
                    form.setStartDate(sessionOpenedAtToLocalInput(open.opened_at, timezone))
                    form.setEndDate(endOfTodayLocalDateTime(timezone))
                } else {
                    void api.getLastClosureDate('mine').then((result) => {
                        if (reqId !== mineClosureReqRef.current) return
                        if (result?.suggestedStart && result?.suggestedEnd) {
                            form.setStartDate(result.suggestedStart)
                            form.setEndDate(result.suggestedEnd)
                        }
                    })
                }
                return
            }

            if (closable) {
                setMineClosureGate({
                    loading: false,
                    canCalculate: true,
                    reason: 'ok',
                    errorMessage: null,
                    closableSessionId: closable.id,
                    register,
                    openSession: null,
                    closableSession: closable,
                })
                form.setStartDate(sessionOpenedAtToLocalInput(closable.opened_at, timezone))
                if (closable.closed_at) {
                    form.setEndDate(sessionOpenedAtToLocalInput(closable.closed_at, timezone))
                }
                return
            }

            setMineClosureGate({
                loading: false,
                canCalculate: false,
                reason: 'no-pending',
                errorMessage: null,
                closableSessionId: null,
                register,
                openSession: null,
                closableSession: null,
            })
            void api.getLastClosureDate('mine').then((result) => {
                if (reqId !== mineClosureReqRef.current) return
                if (result?.suggestedStart && result?.suggestedEnd) {
                    form.setStartDate(result.suggestedStart)
                    form.setEndDate(result.suggestedEnd)
                }
            })
        })
    }

    useEffect(() => {
        refreshMineClosureGate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveScope, user?.id, timezone])

    useEffect(() => {
        if (effectiveScope !== 'mine') return
        const onFocus = () => {
            refreshMineClosureGate()
        }
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveScope, user?.id, timezone])

    // Load closures on mount and when filters change (restaura página al volver; pág. 1 si cambian filtros)
    useEffect(() => {
        const filters = (historyStatus || historyStartDate || historyEndDate)
            ? { status: historyStatus || undefined, startDate: historyStartDate || undefined, endDate: historyEndDate || undefined }
            : undefined
        const sig = JSON.stringify({
            st: filters?.status ?? '',
            sd: filters?.startDate ?? '',
            ed: filters?.endDate ?? '',
        })
        let page = 1
        if (historyFirstLoadRef.current) {
            historyFirstLoadRef.current = false
            const s = readListUiPersisted('cierre-caja/historial')
            page = Math.max(1, Number(s.page) || 1)
        } else if (historyFilterSigRef.current !== sig) {
            page = 1
        } else {
            page = api.currentPage
        }
        historyFilterSigRef.current = sig
        void api.fetchClosures(page, form.isSeller, undefined, filters)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyStatus, historyStartDate, historyEndDate])

    // Sugerir período solo para cierre del día (el «mi cierre» toma horario del turno en caja)
    useEffect(() => {
        if (effectiveScope !== 'day') return
        void api.getLastClosureDate('day').then((result) => {
            if (result?.suggestedStart && result?.suggestedEnd) {
                form.setStartDate(result.suggestedStart)
                form.setEndDate(result.suggestedEnd)
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveScope])

    const mineClosureBlockedHint = (): string => {
        switch (mineClosureGate.reason) {
            case 'register-open-own':
                return 'Cierre el turno en «Nueva venta» (fin de turno); mientras la caja siga abierta no puede arquear.'
            case 'register-open-other':
                return 'Hay turno abierto de otro cajero en esta caja.'
            case 'no-pending':
                return 'No hay turno cerrado pendiente de arqueo. Abra y cierre turno en «Nueva venta» primero.'
            default:
                return 'Actualice la página o revise su conexión.'
        }
    }

    // Handlers
    const handleCalculateTheoretical = async () => {
        const cashierId = effectiveScope === 'mine' ? (user?.id ?? undefined) : undefined
        let cashRegisterSessionId: string | undefined
        if (effectiveScope === 'mine') {
            if (!mineClosureGate.canCalculate || mineClosureGate.loading || !mineClosureGate.closableSessionId) {
                toast({
                    title: 'No puede calcular ahora',
                    description: mineClosureBlockedHint(),
                    variant: 'destructive',
                })
                return
            }
            const r = await fetchCashSessionCurrent()
            if (!r.ok) {
                toast({ title: 'No se pudo verificar el turno', description: r.message, variant: 'destructive' })
                void refreshMineClosureGate()
                return
            }
            if (r.session?.status === 'OPEN') {
                toast({
                    title: 'Caja con turno abierto',
                    description:
                        'Mientras haya turno abierto en esta caja no se calcula el cierre. Use «Fin de turno» en «Nueva venta».',
                    variant: 'destructive',
                })
                void refreshMineClosureGate()
                return
            }
            const cs = r.closableSession
            if (!cs?.id || cs.status !== 'CLOSED' || cs.cash_closure_id) {
                toast({
                    title: 'Sin turno listo para arqueo',
                    description: 'No hay turno cerrado pendiente de cierre contable, o ya fue arqueado.',
                    variant: 'destructive',
                })
                void refreshMineClosureGate()
                return
            }
            if (String(cs.opened_by_id) !== String(user?.id)) {
                toast({
                    title: 'Sesión no válida',
                    description: 'Solo puede arquear su propio turno en esta caja.',
                    variant: 'destructive',
                })
                void refreshMineClosureGate()
                return
            }
            cashRegisterSessionId = cs.id
        }
        const data = await api.calculateTheoretical(form.startDate, form.endDate, cashierId, cashRegisterSessionId)
        if (data) {
            form.initializeFromTheoretical(data)
        }
    }

    const performSaveClosure = async () => {
        if (!api.theoreticalData) return false
        let cashRegisterSessionId: string | undefined
        if (effectiveScope === 'mine') {
            const r = await fetchCashSessionCurrent()
            if (!r.ok) {
                toast({ title: 'No se pudo verificar el turno', description: r.message, variant: 'destructive' })
                return false
            }
            if (r.session?.status === 'OPEN') {
                toast({
                    title: 'Caja con turno abierto',
                    description: 'Cierre el turno en «Nueva venta» antes de guardar el arqueo.',
                    variant: 'destructive',
                })
                void refreshMineClosureGate()
                return false
            }
            const cs = r.closableSession
            if (!cs?.id || cs.status !== 'CLOSED' || cs.cash_closure_id) {
                toast({
                    title: 'No hay turno para vincular',
                    description: 'El turno ya no está disponible para este cierre. Recalcule o actualice.',
                    variant: 'destructive',
                })
                void refreshMineClosureGate()
                return false
            }
            if (String(cs.opened_by_id) !== String(user?.id)) {
                toast({ title: 'Sesión no válida', description: 'Solo puede guardar el cierre de su turno.', variant: 'destructive' })
                return false
            }
            cashRegisterSessionId = cs.id
        }
        const success = await api.saveClosure({
            startDate: form.startDate,
            endDate: form.endDate,
            cashierName: form.cashierName,
            cashierId: effectiveScope === 'mine' ? (user?.id ?? undefined) : undefined,
            cashRegisterSessionId: effectiveScope === 'mine' ? cashRegisterSessionId : undefined,
            theoreticalData: api.theoreticalData,
            actualTotal: form.getActualTotal(),
            notes: form.notes,
            paymentBreakdown: form.paymentBreakdown,
            denominations: form.denominations
        })
        if (success) {
            form.resetForm()
            void refreshMineClosureGate()
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
        const differencePct = form.getDifferencePercentage(theoreticalTotal)
        const isLargeDifference = theoreticalTotal > 0 && Math.abs(differencePct) > cashClosureMaxDiffPct

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
            generateClosurePDF(selectedClosure, companyName, currencyCode, locale)
            toast({ title: 'PDF Generado', description: `Cierre #${selectedClosure.closure_number} descargado` })
        }
    }

    // Check if cash payment method exists
    const hasCashPayment = form.paymentBreakdown.some(
        p => p.payment_method_name?.toLowerCase().includes('efectivo')
    )

    const canViewHistory = hasPermission('cashclosure.view')

    const fmtSessionDt = (iso: string | null | undefined) =>
        iso
            ? new Date(iso).toLocaleString(locale || 'es-GT', { dateStyle: 'short', timeStyle: 'short' })
            : '—'

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Cierre de Caja</h2>
                    <p className="text-muted-foreground">
                        Mi cierre: arqueo del turno ya cerrado en «Nueva venta» (no mientras la caja siga abierta). Si aplica,
                        también cierre del día para todos los cajeros.
                    </p>
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
                            {effectiveScope === 'mine' ? (
                                mineClosureGate.loading ? (
                                    <p className="text-sm text-muted-foreground">Cargando datos de la caja…</p>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-0.5">Caja</p>
                                                <p className="text-sm font-medium">
                                                    {mineClosureGate.register?.name ?? '—'}
                                                    {mineClosureGate.register?.code ? (
                                                        <span className="text-muted-foreground font-normal">
                                                            {' '}
                                                            · {mineClosureGate.register.code}
                                                        </span>
                                                    ) : null}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-0.5">Turno en caja</p>
                                                <p className="text-sm font-medium">
                                                    {mineClosureGate.openSession
                                                        ? `Abierto · desde ${fmtSessionDt(mineClosureGate.openSession.opened_at)}`
                                                        : mineClosureGate.closableSession
                                                          ? `Cerrado · ${fmtSessionDt(mineClosureGate.closableSession.opened_at)} → ${fmtSessionDt(mineClosureGate.closableSession.closed_at)}`
                                                          : 'Sin turno cerrado pendiente de arqueo'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-0.5">
                                                    Horario del período (arqueo)
                                                </p>
                                                <p className="text-sm font-medium tabular-nums">
                                                    {form.startDate && form.endDate ? (
                                                        <>
                                                            {form.startDate.split('T')[1]?.substring(0, 8) || '00:00:00'} —{' '}
                                                            {form.endDate.split('T')[1]?.substring(0, 8) || '23:59:59'}
                                                        </>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-0.5">Fondo inicial del turno</p>
                                                <p className="text-sm font-medium tabular-nums">
                                                    {mineClosureGate.openSession
                                                        ? new Intl.NumberFormat(locale || 'es-GT', {
                                                              style: 'currency',
                                                              currency: currencyCode || 'GTQ',
                                                          }).format(Number(mineClosureGate.openSession.opening_float))
                                                        : mineClosureGate.closableSession
                                                          ? new Intl.NumberFormat(locale || 'es-GT', {
                                                                style: 'currency',
                                                                currency: currencyCode || 'GTQ',
                                                            }).format(Number(mineClosureGate.closableSession.opening_float))
                                                          : '—'}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                                            Solo se cuentan sus ventas ligadas a ese turno en esta caja. Mientras haya turno
                                            abierto en la caja no se puede calcular el cierre: cierre el turno en «Nueva
                                            venta» y vuelva aquí.
                                        </p>
                                    </>
                                )
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Fecha</p>
                                            <p className="text-sm font-medium">
                                                {new Date().toLocaleDateString(locale || 'es-GT', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Horario del período</p>
                                            <p className="text-sm font-medium tabular-nums">
                                                {form.startDate && form.endDate ? (
                                                    <>
                                                        {form.startDate.split('T')[1]?.substring(0, 8) || '00:00:00'} —{' '}
                                                        {form.endDate.split('T')[1]?.substring(0, 8) || '23:59:59'}
                                                    </>
                                                ) : (
                                                    'Cargando...'
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                                        Desde el fin del último cierre del día hasta las 23:59:59 de hoy (todas las
                                        ventas).
                                    </p>
                                </>
                            )}
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
                                            <SelectItem value="mine">Mi cierre (mis ventas del turno en caja)</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {!showClosureTypeSelector && (
                            <p className="text-sm text-muted-foreground">
                                {effectiveScope === 'day'
                                    ? 'Generando: cierre del día (todos los cajeros).'
                                    : 'Generando: mi cierre (ventas de mi turno en caja).'}
                            </p>
                        )}

                        {effectiveScope === 'mine' && (
                            <p
                                className={`text-sm rounded-md border px-3 py-2 ${
                                    mineClosureGate.loading || !mineClosureGate.canCalculate
                                        ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100'
                                }`}
                            >
                                {mineClosureGate.loading && 'Comprobando la caja y los turnos…'}
                                {!mineClosureGate.loading && mineClosureGate.reason === 'ok' && (
                                    <>
                                        Turno cerrado listo para arqueo. Puede pulsar «Calcular mi cierre» (ventas de
                                        ese turno en la caja).
                                    </>
                                )}
                                {!mineClosureGate.loading && mineClosureGate.reason === 'register-open-own' && (
                                    <>
                                        <span className="font-medium">Calcular bloqueado:</span> tiene la caja abierta.
                                        Use «Fin de turno» en «Nueva venta»; después podrá arquear ese turno aquí.
                                    </>
                                )}
                                {!mineClosureGate.loading && mineClosureGate.reason === 'register-open-other' && (
                                    <>
                                        <span className="font-medium">Calcular bloqueado:</span> hay turno abierto de
                                        otro cajero en esta caja.
                                    </>
                                )}
                                {!mineClosureGate.loading && mineClosureGate.reason === 'no-pending' && (
                                    <>
                                        <span className="font-medium">Calcular bloqueado:</span> no hay turno cerrado
                                        pendiente de arqueo. Abra caja, venda, cierre turno en «Nueva venta» y vuelva.
                                    </>
                                )}
                                {!mineClosureGate.loading && mineClosureGate.reason === 'error' && (
                                    <>
                                        <span className="font-medium">No se pudo comprobar la caja.</span>{' '}
                                        {mineClosureGate.errorMessage || 'Intente de nuevo o revise su conexión.'}
                                    </>
                                )}
                            </p>
                        )}

                        <Button
                            onClick={handleCalculateTheoretical}
                            disabled={
                                api.isCalculating ||
                                (effectiveScope === 'mine' &&
                                    (mineClosureGate.loading ||
                                        !mineClosureGate.canCalculate ||
                                        !mineClosureGate.closableSessionId))
                            }
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
                                currencyCode={currencyCode}
                                locale={locale}
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
                                disabled={
                                    api.isSaving ||
                                    (effectiveScope === 'mine' &&
                                        (mineClosureGate.loading ||
                                            mineClosureGate.reason !== 'ok' ||
                                            !mineClosureGate.closableSessionId))
                                }
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
                    <p className="text-sm text-muted-foreground pt-1">
                        Haz clic en un cierre para ver el detalle, descargar PDF o aprobar / rechazar según tu rol.
                    </p>
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
                            La diferencia supera el {cashClosureMaxDiffPct}% configurado.
                            {api.theoreticalData && (
                                <>
                                    {' '}
                                    Diferencia: {form.getTotalDifference(api.theoreticalData.theoretical.net_total) >= 0 ? '+' : ''}
                                    {new Intl.NumberFormat(locale || 'es-GT', { style: 'currency', currency: currencyCode || 'GTQ' }).format(form.getTotalDifference(api.theoreticalData.theoretical.net_total))} ({form.getDifferencePercentage(api.theoreticalData.theoretical.net_total).toFixed(1)}%).
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
