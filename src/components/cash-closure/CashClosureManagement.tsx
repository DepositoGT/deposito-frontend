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
import { Calculator, FileText, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/useAuth'

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

    // Hooks
    const form = useCashClosureForm()
    const api = useCashClosureAPI()

    // Dialog states
    const [selectedClosure, setSelectedClosure] = useState<CashClosure | null>(null)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [supervisorName] = useState(user?.name || user?.email || '')

    // Load closures on mount
    useEffect(() => {
        api.fetchClosures(1, form.isSeller)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Handlers
    const handleCalculateTheoretical = async () => {
        const data = await api.calculateTheoretical(form.startDate, form.endDate)
        if (data) {
            form.initializeFromTheoretical(data)
        }
    }

    const handleSaveClosure = async () => {
        if (!api.theoreticalData) {
            toast({ title: 'Error', description: 'Primero debes calcular el cierre teórico', variant: 'destructive' })
            return
        }

        const success = await api.saveClosure({
            startDate: form.startDate,
            endDate: form.endDate,
            cashierName: form.cashierName,
            theoreticalData: api.theoreticalData,
            actualTotal: form.getActualTotal(),
            notes: form.notes,
            paymentBreakdown: form.paymentBreakdown,
            denominations: form.denominations
        })

        if (success) {
            form.resetForm()
            api.fetchClosures(1, form.isSeller)
        }
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
            api.fetchClosures(api.currentPage, form.isSeller)
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
            api.fetchClosures(api.currentPage, form.isSeller)
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Cierre de Caja</h2>
            </div>

            {/* New Closure Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Nuevo Cierre de Caja
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Today's Date Info */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-900 mb-2">Cierre de Caja del Día</h4>
                        <p className="text-sm text-orange-800">
                            <strong>Fecha:</strong> {new Date().toLocaleDateString('es-GT', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </p>
                        <p className="text-sm text-orange-800">
                            <strong>Período:</strong> {form.startDate && form.endDate ? (
                                <>{form.startDate.split('T')[1]?.substring(0, 8) || '00:00:00'} - {form.endDate.split('T')[1]?.substring(0, 8) || '23:59:59'}</>
                            ) : 'Cargando...'}
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                            * El período se calcula desde la primera hasta la última venta del día
                        </p>
                    </div>

                    <Button onClick={handleCalculateTheoretical} disabled={api.isCalculating} className="w-full">
                        {api.isCalculating ? 'Calculando...' : 'Calcular Cierre del Día'}
                    </Button>

                    {/* Form sections - only show after calculation */}
                    {api.theoreticalData && (
                        <>
                            <TheoreticalSummary data={api.theoreticalData} />

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

                            <ClosureSummaryCard
                                theoreticalTotal={api.theoreticalData.theoretical.net_total}
                                actualTotal={form.getActualTotal()}
                                difference={form.getTotalDifference(api.theoreticalData.theoretical.net_total)}
                                differencePercentage={form.getDifferencePercentage(api.theoreticalData.theoretical.net_total)}
                            />

                            {/* Cashier Info */}
                            <div className="border rounded-lg p-4 bg-muted/50">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Cajero</p>
                                        <p className="font-semibold">{form.cashierName}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas</Label>
                                <Textarea
                                    id="notes"
                                    value={form.notes}
                                    onChange={(e) => form.setNotes(e.target.value)}
                                    placeholder="Observaciones generales del cierre (opcional)"
                                    rows={3}
                                />
                            </div>

                            {/* Save Button */}
                            <Button onClick={handleSaveClosure} disabled={api.isSaving} className="w-full" size="lg">
                                {api.isSaving ? 'Guardando...' : 'Guardar Cierre de Caja'}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Closures History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {form.isSeller ? 'Último Cierre de Caja' : 'Historial de Cierres'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <ClosuresHistoryList
                            closures={api.closures}
                            isLoading={api.isLoadingClosures}
                            isSeller={form.isSeller}
                            currentPage={api.currentPage}
                            totalPages={api.totalPages}
                            onViewClosure={handleViewClosure}
                            onPageChange={(page) => api.fetchClosures(page, form.isSeller)}
                        />
                    </div>
                </CardContent>
            </Card>

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
        </div>
    )
}

export default CashClosureManagement
