/**
 * ImportDialog - Modal for bulk product import
 * 
 * Features:
 * - Drag & drop file upload
 * - Excel template download
 * - Validation preview with error display
 * - Bulk import execution
 */
import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Upload,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    X,
    FileUp
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImportSuccess?: () => void
}

interface ValidationRow {
    rowIndex: number
    valid: boolean
    errors: string[]
    data: Record<string, unknown>
}

interface ValidationResult {
    validRows: ValidationRow[]
    invalidRows: ValidationRow[]
    totals: {
        total: number
        valid: number
        invalid: number
    }
    catalogs: {
        categories: string[]
        suppliers: string[]
    }
}

type ImportStep = 'idle' | 'parsing' | 'validating' | 'preview' | 'importing' | 'success' | 'error'

export function ImportDialog({ open, onOpenChange, onImportSuccess }: ImportDialogProps) {
    const { toast } = useToast()
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // State
    const [step, setStep] = useState<ImportStep>('idle')
    const [file, setFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([])
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
    const [importProgress, setImportProgress] = useState(0)
    const [errorMessage, setErrorMessage] = useState<string>('')
    const [isDragging, setIsDragging] = useState(false)

    // Reset state
    const resetState = useCallback(() => {
        setStep('idle')
        setFile(null)
        setParsedData([])
        setValidationResult(null)
        setImportProgress(0)
        setErrorMessage('')
        setIsDragging(false)
    }, [])

    // Handle dialog close
    const handleClose = useCallback(() => {
        resetState()
        onOpenChange(false)
    }, [resetState, onOpenChange])

    // Download template
    const handleDownloadTemplate = async () => {
        try {
            const response = await fetch('/api/products/import-template', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth:token')}`
                }
            })
            if (!response.ok) throw new Error('Error descargando plantilla')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'plantilla_productos.xlsx'
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)

            toast({
                title: 'Plantilla descargada',
                description: 'El archivo Excel se descargó correctamente'
            })
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo descargar la plantilla'
            })
        }
    }

    // Parse Excel file and redirect to import page
    const parseFile = useCallback(async (selectedFile: File) => {
        setFile(selectedFile)
        setStep('parsing')

        try {
            const buffer = await selectedFile.arrayBuffer()

            // Convert ArrayBuffer to base64 for sessionStorage
            const bytes = new Uint8Array(buffer)
            let binary = ''
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i])
            }
            const base64 = btoa(binary)

            // Store in sessionStorage for the import page
            sessionStorage.setItem('import:fileName', selectedFile.name)
            sessionStorage.setItem('import:fileData', base64)

            // Close dialog and navigate to import page
            onOpenChange(false)
            navigate('/inventario/importar')
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Error al procesar el archivo')
            setStep('error')
        }
    }, [navigate, onOpenChange])

    // Validate data against server
    const validateData = async (selectedFile: File) => {
        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const response = await fetch('/api/products/validate-import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth:token')}`
                },
                body: formData
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Error en validación')
            }

            setValidationResult(result)
            setStep('preview')
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Error en validación')
            setStep('error')
        }
    }

    // Execute import
    const handleImport = async () => {
        if (!file) return

        setStep('importing')
        setImportProgress(10)

        try {
            const formData = new FormData()
            formData.append('file', file)

            setImportProgress(30)

            const response = await fetch('/api/products/bulk-import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth:token')}`
                },
                body: formData
            })

            setImportProgress(80)

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Error en importación')
            }

            setImportProgress(100)
            setStep('success')

            toast({
                title: '¡Importación exitosa!',
                description: result.message
            })

            // Notify parent
            setTimeout(() => {
                onImportSuccess?.()
                handleClose()
            }, 1500)
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Error en importación')
            setStep('error')
        }
    }

    // Drag & drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (files.length > 0) {
            const droppedFile = files[0]
            if (droppedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
                parseFile(droppedFile)
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Archivo no válido',
                    description: 'Solo se permiten archivos Excel (.xlsx, .xls) o CSV'
                })
            }
        }
    }, [parseFile, toast])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (files && files.length > 0) {
            parseFile(files[0])
        }
    }, [parseFile])

    // Render different steps
    const renderContent = () => {
        switch (step) {
            case 'idle':
                return (
                    <div className="space-y-6">
                        {/* Download template section */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                <div>
                                    <p className="font-medium">Plantilla de Excel</p>
                                    <p className="text-sm text-muted-foreground">
                                        Descarga la plantilla con el formato correcto
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={handleDownloadTemplate}>
                                <Download className="h-4 w-4 mr-2" />
                                Descargar
                            </Button>
                        </div>

                        {/* Dropzone */}
                        <div
                            className={`
                relative border-2 border-dashed rounded-lg p-12
                flex flex-col items-center justify-center gap-4
                transition-colors cursor-pointer
                ${isDragging
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted-foreground/25 hover:border-primary/50'
                                }
              `}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileSelect}
                            />

                            <div className={`
                p-4 rounded-full transition-colors
                ${isDragging ? 'bg-primary/10' : 'bg-muted'}
              `}>
                                <Upload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>

                            <div className="text-center">
                                <p className="font-medium">
                                    {isDragging ? 'Suelta el archivo aquí' : 'Arrastra y suelta tu archivo Excel'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    o haz clic para seleccionar
                                </p>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Formatos permitidos: .xlsx, .xls, .csv (máx. 10MB)
                            </p>
                        </div>
                    </div>
                )

            case 'parsing':
            case 'validating':
                return (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="font-medium">
                            {step === 'parsing' ? 'Leyendo archivo...' : 'Validando datos...'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {parsedData.length > 0 && `${parsedData.length} filas detectadas`}
                        </p>
                    </div>
                )

            case 'preview':
                return (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="flex flex-wrap gap-3">
                            <Badge variant="secondary" className="text-base px-3 py-1">
                                <FileUp className="h-4 w-4 mr-2" />
                                {file?.name}
                            </Badge>
                            <Badge variant="outline" className="text-base px-3 py-1">
                                Total: {validationResult?.totals.total}
                            </Badge>
                            <Badge variant="default" className="text-base px-3 py-1 bg-green-600">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Válidos: {validationResult?.totals.valid}
                            </Badge>
                            {(validationResult?.totals.invalid ?? 0) > 0 && (
                                <Badge variant="destructive" className="text-base px-3 py-1">
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Errores: {validationResult?.totals.invalid}
                                </Badge>
                            )}
                        </div>

                        {/* Errors table */}
                        {(validationResult?.invalidRows.length ?? 0) > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-destructive">
                                    <AlertCircle className="h-5 w-5" />
                                    <span className="font-medium">Errores encontrados:</span>
                                </div>
                                <ScrollArea className="h-[200px] border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-20">Fila</TableHead>
                                                <TableHead>Errores</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {validationResult?.invalidRows.map((row) => (
                                                <TableRow key={row.rowIndex}>
                                                    <TableCell className="font-mono">{row.rowIndex}</TableCell>
                                                    <TableCell>
                                                        <ul className="list-disc list-inside text-sm text-destructive">
                                                            {row.errors.map((err, i) => (
                                                                <li key={i}>{err}</li>
                                                            ))}
                                                        </ul>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        )}

                        {/* Valid rows preview */}
                        {(validationResult?.validRows.length ?? 0) > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="font-medium">Productos a importar ({validationResult?.validRows.length}):</span>
                                </div>
                                <ScrollArea className="h-[150px] border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nombre</TableHead>
                                                <TableHead>Categoría</TableHead>
                                                <TableHead>Precio</TableHead>
                                                <TableHead>Stock</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {validationResult?.validRows.slice(0, 10).map((row) => (
                                                <TableRow key={row.rowIndex}>
                                                    <TableCell>{String(row.data.name || '-')}</TableCell>
                                                    <TableCell>{String(row.data.category_id || '-')}</TableCell>
                                                    <TableCell>Q{Number(row.data.price || 0).toFixed(2)}</TableCell>
                                                    <TableCell>{String(row.data.stock || 0)}</TableCell>
                                                </TableRow>
                                            ))}
                                            {(validationResult?.validRows.length ?? 0) > 10 && (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                        ... y {(validationResult?.validRows.length ?? 0) - 10} más
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={resetState}>
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={(validationResult?.validRows.length ?? 0) === 0}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Importar {validationResult?.validRows.length} productos
                            </Button>
                        </div>
                    </div>
                )

            case 'importing':
                return (
                    <div className="flex flex-col items-center justify-center py-12 gap-6">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <div className="w-full max-w-md space-y-2">
                            <Progress value={importProgress} className="h-2" />
                            <p className="text-center font-medium">Importando productos...</p>
                            <p className="text-center text-sm text-muted-foreground">
                                Por favor, no cierre esta ventana
                            </p>
                        </div>
                    </div>
                )

            case 'success':
                return (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="p-4 rounded-full bg-green-100">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                        <p className="text-xl font-medium">¡Importación completada!</p>
                        <p className="text-muted-foreground">
                            Los productos han sido agregados exitosamente
                        </p>
                    </div>
                )

            case 'error':
                return (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="p-4 rounded-full bg-red-100">
                            <XCircle className="h-12 w-12 text-red-600" />
                        </div>
                        <p className="text-xl font-medium">Error en la importación</p>
                        <p className="text-muted-foreground text-center max-w-md">
                            {errorMessage}
                        </p>
                        <Button variant="outline" onClick={resetState}>
                            Intentar de nuevo
                        </Button>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Importar Productos
                    </DialogTitle>
                    <DialogDescription>
                        Importa productos masivamente desde un archivo Excel
                    </DialogDescription>
                </DialogHeader>

                {renderContent()}
            </DialogContent>
        </Dialog>
    )
}
