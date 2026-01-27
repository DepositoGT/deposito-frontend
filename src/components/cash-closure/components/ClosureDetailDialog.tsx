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
 * ClosureDetailDialog - Dialog for viewing closure details
 */
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, ThumbsUp, ThumbsDown } from 'lucide-react'
import type { CashClosure } from '../types'
import { formatCurrency, formatDateTime, toNumber } from '../types'

interface ClosureDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    closure: CashClosure | null
    isSeller: boolean
    onApprove: () => void
    onReject: () => void
    onDownloadPDF: () => void
}

const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        'Pendiente': 'secondary',
        'Validado': 'default',
        'Cerrado': 'outline'
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
}

export const ClosureDetailDialog = ({
    open,
    onOpenChange,
    closure,
    isSeller,
    onApprove,
    onReject,
    onDownloadPDF
}: ClosureDetailDialogProps) => {
    if (!closure) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detalle del Cierre #{closure.closure_number}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Período</p>
                            <p className="font-medium">{formatDateTime(closure.start_date)}</p>
                            <p className="font-medium">hasta {formatDateTime(closure.end_date)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Estado</p>
                            {getStatusBadge(closure.status)}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="border rounded-lg p-4 bg-muted/50">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Teórico</p>
                                <p className="text-xl font-bold">{formatCurrency(closure.theoretical_total)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Contado</p>
                                <p className="text-xl font-bold">{formatCurrency(closure.actual_total)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Diferencia</p>
                                <p className={`text-xl font-bold ${toNumber(closure.difference) === 0 ? 'text-green-600' : toNumber(closure.difference) > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                    {toNumber(closure.difference) >= 0 ? '+' : ''}{formatCurrency(closure.difference)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Breakdown */}
                    <div>
                        <h4 className="font-semibold mb-2">Desglose por Método de Pago</h4>
                        <div className="space-y-2">
                            {closure.payment_breakdowns?.map((item) => (
                                <div key={item.payment_method_id} className="border rounded p-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium">{item.payment_method?.name || item.payment_method_name}</span>
                                        <Badge variant={toNumber(item.difference) === 0 ? 'default' : toNumber(item.difference) > 0 ? 'secondary' : 'destructive'}>
                                            {toNumber(item.difference) >= 0 ? '+' : ''}{formatCurrency(item.difference)}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Teórico: </span>
                                            <span className="font-medium">{formatCurrency(item.theoretical_amount)}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Contado: </span>
                                            <span className="font-medium">{formatCurrency(item.actual_amount)}</span>
                                        </div>
                                    </div>
                                    {item.notes && (
                                        <p className="text-sm text-muted-foreground mt-2">Nota: {item.notes}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Denominations */}
                    {closure.denominations.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2">Conteo de Efectivo</h4>
                            <div className="border rounded-lg p-3">
                                <div className="grid grid-cols-4 gap-2 text-sm font-semibold mb-2">
                                    <div>Denominación</div>
                                    <div>Tipo</div>
                                    <div>Cantidad</div>
                                    <div>Subtotal</div>
                                </div>
                                {closure.denominations.map((denom, index) => (
                                    <div key={index} className="grid grid-cols-4 gap-2 text-sm py-1">
                                        <div>Q {toNumber(denom.denomination).toFixed(2)}</div>
                                        <div className="text-muted-foreground">{denom.type}</div>
                                        <div>{denom.quantity}</div>
                                        <div className="font-medium">{formatCurrency(denom.subtotal)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-semibold mb-2">Cajero: {closure.cashier_name}</p>
                            {closure.cashier_signature && (
                                <img src={closure.cashier_signature} alt="Firma Cajero" className="border rounded" />
                            )}
                        </div>
                        {closure.supervisor_name && (
                            <div>
                                <p className="text-sm font-semibold mb-2">Supervisor: {closure.supervisor_name}</p>
                                {closure.supervisor_signature && (
                                    <img src={closure.supervisor_signature} alt="Firma Supervisor" className="border rounded" />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    {closure.notes && (
                        <div>
                            <p className="text-sm font-semibold">Notas</p>
                            <p className="text-sm text-muted-foreground">{closure.notes}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between gap-2 pt-4 border-t">
                        <div className="flex gap-2">
                            {closure.status === 'Pendiente' && !isSeller && (
                                <>
                                    <Button variant="default" onClick={onApprove} className="bg-green-600 hover:bg-green-700">
                                        <ThumbsUp className="h-4 w-4 mr-2" />Aprobar
                                    </Button>
                                    <Button variant="destructive" onClick={onReject}>
                                        <ThumbsDown className="h-4 w-4 mr-2" />Rechazar
                                    </Button>
                                </>
                            )}
                        </div>
                        <Button variant="outline" onClick={onDownloadPDF} className="border-green-600 text-green-600 hover:bg-green-50">
                            <Download className="h-4 w-4 mr-2" />Descargar PDF
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
