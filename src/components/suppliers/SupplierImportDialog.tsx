/**
 * SupplierImportDialog - Modal for bulk supplier import
 * 
 * Features:
 * - Drag & drop file upload
 * - Excel template download
 * - Navigate to import page after file upload
 */
import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
    Upload,
    Download,
    FileSpreadsheet,
    Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SupplierImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type ImportStep = 'idle' | 'parsing' | 'error'

export function SupplierImportDialog({ open, onOpenChange }: SupplierImportDialogProps) {
    const { toast } = useToast()
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // State
    const [step, setStep] = useState<ImportStep>('idle')
    const [isDragging, setIsDragging] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>('')

    // Reset state
    const resetState = useCallback(() => {
        setStep('idle')
        setIsDragging(false)
        setErrorMessage('')
    }, [])

    // Handle dialog close
    const handleClose = useCallback(() => {
        resetState()
        onOpenChange(false)
    }, [resetState, onOpenChange])

    // Download template
    const handleDownloadTemplate = async () => {
        try {
            const response = await fetch('/api/suppliers/template', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth:token')}`
                }
            })
            if (!response.ok) throw new Error('Error descargando plantilla')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'plantilla_proveedores.xlsx'
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

            // Store in sessionStorage for the import page (using same keys as products)
            sessionStorage.setItem('import:fileName', selectedFile.name)
            sessionStorage.setItem('import:fileData', base64)

            // Close dialog and navigate to import page
            onOpenChange(false)
            navigate('/proveedores/importar')
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Error al procesar el archivo')
            setStep('error')
        }
    }, [navigate, onOpenChange])

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

    // Render content based on step
    const renderContent = () => {
        if (step === 'parsing') {
            return (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="font-medium">Procesando archivo...</p>
                </div>
            )
        }

        if (step === 'error') {
            return (
                <div className="text-center py-8">
                    <p className="text-destructive mb-4">{errorMessage}</p>
                    <Button onClick={resetState}>Intentar de nuevo</Button>
                </div>
            )
        }

        // Idle step - file upload
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
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Importar Proveedores
                    </DialogTitle>
                    <DialogDescription>
                        Importa proveedores masivamente desde un archivo Excel
                    </DialogDescription>
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    )
}

export default SupplierImportDialog
