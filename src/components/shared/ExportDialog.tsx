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
 * Diálogo de exportación compartido. Todas las pantallas que exportan usan el
 * mismo orden: QUÉ se lleva, con qué ALCANCE, qué COLUMNAS y en qué FORMATO.
 * Cada pantalla solo declara lo suyo; el diálogo no sabe de inventario ni de
 * reportes, así que agregar una pantalla nueva no es copiar otro diálogo.
 */
import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

export type ExportFormat = 'pdf' | 'csv' | 'xlsx'

export const FORMAT_LABELS: Record<ExportFormat, string> = {
    pdf: 'PDF',
    csv: 'CSV / Excel',
    // Contabilidad arma el archivo en el navegador, con los montos como números
    // para que el contador pueda operar sobre ellos.
    xlsx: 'Excel',
}

export interface ExportColumn {
    id: string
    label: string
}

export interface ExportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    /** Una línea diciendo exactamente qué se va a llevar (alcance, filtros, cuántos). */
    summary: string
    /** Columnas elegibles. Sin esto, no se muestra la sección. */
    columns?: ExportColumn[]
    defaultColumns?: string[]
    /** Combinaciones de un clic: "Listado de precios", "Todo". */
    presets?: { label: string; columns: string[] }[]
    /** Campos propios de la pantalla (período, sucursal, almacén…). */
    children?: React.ReactNode
    /** Casillas sueltas de la pantalla (p. ej. "incluir resumen"). */
    extras?: React.ReactNode
    formats?: ExportFormat[]
    pending?: boolean
    /** Botón adicional a la izquierda (p. ej. una vista alterna del PDF). */
    secondaryAction?: { label: string; onClick: () => void }
    onExport: (opts: { format: ExportFormat; columns?: string[] }) => void
}

export const ExportDialog = ({
    open,
    onOpenChange,
    title,
    summary,
    columns,
    defaultColumns,
    presets,
    children,
    extras,
    formats = ['pdf', 'csv'],
    pending = false,
    secondaryAction,
    onExport,
}: ExportDialogProps) => {
    const [selected, setSelected] = useState<string[]>(defaultColumns ?? [])

    // Al reabrir vuelve a la selección por defecto: la anterior confunde más de
    // lo que ahorra, sobre todo si cambió el alcance.
    useEffect(() => {
        if (open) setSelected(defaultColumns ?? [])
    }, [open, defaultColumns])

    const toggle = (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{summary}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {children}

                    {columns && columns.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Columnas</p>
                            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                                {columns.map((col) => (
                                    <label key={col.id} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                            checked={selected.includes(col.id)}
                                            onCheckedChange={() => toggle(col.id)}
                                        />
                                        <span className="text-sm">{col.label}</span>
                                    </label>
                                ))}
                            </div>
                            {presets && presets.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {presets.map((p) => (
                                        <Button
                                            key={p.label}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelected(p.columns)}
                                        >
                                            {p.label}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {extras}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                        {secondaryAction && (
                            <Button type="button" variant="ghost" size="sm" onClick={secondaryAction.onClick}>
                                {secondaryAction.label}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="ml-auto"
                            onClick={() => onOpenChange(false)}
                            disabled={pending}
                        >
                            Cancelar
                        </Button>
                        {formats.map((format, i) => (
                            <Button
                                key={format}
                                type="button"
                                size="sm"
                                variant={i === formats.length - 1 ? 'default' : 'outline'}
                                disabled={pending}
                                onClick={() =>
                                    onExport({ format, columns: columns ? selected : undefined })
                                }
                            >
                                <Download className="w-4 h-4 mr-2" />
                                {pending ? 'Generando…' : FORMAT_LABELS[format]}
                            </Button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default ExportDialog
