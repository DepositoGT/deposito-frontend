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
 * SupplierImportPage - Advanced import page for suppliers with column mapping
 * 
 * Features:
 * - Sheet selector for multi-sheet Excel files
 * - Column mapping with system field dropdowns
 * - Preview of first row data per column
 * - Real-time validation feedback
 * - Manual category association for non-existent categories
 */
import { useState, useEffect, useMemo } from 'react'
import { getApiBaseUrl } from '@/services/api'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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
    FileSpreadsheet,
    Upload,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    ChevronsUpDown,
    Check
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

// System fields available for mapping (Supplier fields)
const SYSTEM_FIELDS = [
    { id: 'name', label: 'Nombre', required: true, type: 'string' },
    { id: 'contact', label: 'Contacto', required: true, type: 'string' },
    { id: 'phone', label: 'Teléfono', required: true, type: 'string' },
    { id: 'email', label: 'Email', required: true, type: 'string' },
    { id: 'address', label: 'Dirección', required: true, type: 'string' },
    { id: 'category', label: 'Categoría', required: true, type: 'relation' },
    { id: 'payment_terms', label: 'Términos de Pago', required: false, type: 'relation' },
    { id: 'rating', label: 'Calificación', required: false, type: 'number' },
]

interface ColumnMapping {
    excelColumn: string
    systemField: string | null
    sampleData: string[]
}

type ImportStep = 'mapping' | 'testing' | 'validating' | 'importing' | 'success' | 'error'

interface ValidationError {
    rowIndex: number
    errors: string[]
    fieldErrors: Record<string, string[]>
}

const HR = () => <div className="border-t my-4" />

export default function SupplierImportPage() {
    const navigate = useNavigate()
    const { toast } = useToast()

    // State
    const [step, setStep] = useState<ImportStep>('mapping')
    const [file, setFile] = useState<File | null>(null)
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
    const [sheetNames, setSheetNames] = useState<string[]>([])
    const [selectedSheet, setSelectedSheet] = useState<string>('')
    const [useFirstRowAsHeader, setUseFirstRowAsHeader] = useState(true)
    const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
    const [importProgress, setImportProgress] = useState(0)
    const [errorMessage, setErrorMessage] = useState('')
    const [importResult, setImportResult] = useState<{ created: number; skipped?: number } | null>(null)

    // Testing/Validation state
    const [isTesting, setIsTesting] = useState(false)
    const [hasTestedOnce, setHasTestedOnce] = useState(false)
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
    const [validRowCount, setValidRowCount] = useState(0)
    const [totalRowCount, setTotalRowCount] = useState(0)

    // Catalog data for manual association
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
    const [paymentTerms, setPaymentTerms] = useState<{ id: number; name: string }[]>([])

    // Value overrides
    const [valueOverrides, setValueOverrides] = useState<Record<string, Record<string, string>>>({})

    // Check for file in sessionStorage on mount
    useEffect(() => {
        const storedFileName = sessionStorage.getItem('import:fileName')
        const storedFileData = sessionStorage.getItem('import:fileData')

        if (storedFileName && storedFileData) {
            try {
                const binaryString = atob(storedFileData)
                const bytes = new Uint8Array(binaryString.length)
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i)
                }

                const wb = XLSX.read(bytes.buffer, { type: 'array' })
                setWorkbook(wb)
                setSheetNames(wb.SheetNames)
                setSelectedSheet(wb.SheetNames[0])
                setFile({ name: storedFileName } as File)

                sessionStorage.removeItem('import:fileName')
                sessionStorage.removeItem('import:fileData')
            } catch (err) {
                console.error('Error loading file from sessionStorage:', err)
                navigate('/proveedores')
            }
        } else {
            navigate('/proveedores')
        }
    }, [navigate])

    // Fetch catalogs
    useEffect(() => {
        const fetchCatalogs = async () => {
            try {
                const token = localStorage.getItem('auth:token')
                const headers = { 'Authorization': `Bearer ${token}` }

                const [catRes, ptRes] = await Promise.all([
                    fetch('/api/catalogs/product-categories?page=1&pageSize=1000', { headers }),
                    fetch('/api/catalogs/payment-terms?page=1&pageSize=1000', { headers })
                ])

                if (catRes.ok) {
                    const catData = await catRes.json()
                    const catItems = Array.isArray(catData) ? catData : (catData.items ?? [])
                    if (Array.isArray(catItems)) {
                        setCategories(catItems.map((c: { id: number; name: string }) => ({ id: c.id, name: c.name })))
                    }
                }
                if (ptRes.ok) {
                    const ptData = await ptRes.json()
                    const ptItems = Array.isArray(ptData) ? ptData : (ptData.items ?? [])
                    if (Array.isArray(ptItems)) {
                        setPaymentTerms(ptItems.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })))
                    }
                }
            } catch (err) {
                console.error('Error fetching catalogs:', err)
            }
        }
        fetchCatalogs()
    }, [])

    // Parse selected sheet
    useEffect(() => {
        if (!workbook || !selectedSheet) return

        const sheet = workbook.Sheets[selectedSheet]
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            header: useFirstRowAsHeader ? undefined : 1,
            defval: ''
        })

        if (data.length === 0) {
            setColumnMappings([])
            return
        }

        const columns = Object.keys(data[0])
        const mappings: ColumnMapping[] = columns.map(col => {
            const samples = data.slice(0, 3).map(row => String(row[col] || ''))
            const lowerCol = col.toLowerCase().trim()
            let autoField: string | null = null

            if (lowerCol.includes('nombre') || lowerCol === 'name') autoField = 'name'
            else if (lowerCol.includes('contacto') || lowerCol === 'contact') autoField = 'contact'
            else if (lowerCol.includes('telefono') || lowerCol === 'phone') autoField = 'phone'
            else if (lowerCol.includes('email') || lowerCol.includes('correo')) autoField = 'email'
            else if (lowerCol.includes('direccion') || lowerCol === 'address') autoField = 'address'
            else if (lowerCol.includes('categor')) autoField = 'category'
            else if (lowerCol.includes('pago') || lowerCol.includes('payment')) autoField = 'payment_terms'
            else if (lowerCol.includes('calificacion') || lowerCol === 'rating') autoField = 'rating'

            return { excelColumn: col, systemField: autoField, sampleData: samples }
        })

        setColumnMappings(mappings)
    }, [workbook, selectedSheet, useFirstRowAsHeader])

    const requiredFieldsMapped = useMemo(() => {
        const mappedFields = columnMappings.map(m => m.systemField).filter(Boolean)
        return SYSTEM_FIELDS.filter(f => f.required).every(f => mappedFields.includes(f.id))
    }, [columnMappings])

    const handleMappingChange = (excelColumn: string, systemField: string | null) => {
        setColumnMappings(prev => {
            const newMappings = prev.map(m => {
                if (m.systemField === systemField && systemField !== null) {
                    return { ...m, systemField: null }
                }
                return m
            })
            return newMappings.map(m =>
                m.excelColumn === excelColumn ? { ...m, systemField } : m
            )
        })
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const data = event.target?.result
                const wb = XLSX.read(data, { type: 'array' })
                setWorkbook(wb)
                setSheetNames(wb.SheetNames)
                setSelectedSheet(wb.SheetNames[0])
                setFile(selectedFile)
                setHasTestedOnce(false)
                setValidationErrors([])
            } catch (err) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo leer el archivo' })
            }
        }
        reader.readAsArrayBuffer(selectedFile)
    }

    const handleTest = async () => {
        if (!workbook || !selectedSheet) return

        setIsTesting(true)
        setStep('testing')

        try {
            const sheet = workbook.Sheets[selectedSheet]
            const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
                header: useFirstRowAsHeader ? undefined : 1,
                defval: ''
            })

            setTotalRowCount(data.length)

            const mappedData = data.map(row => {
                const mapped: Record<string, unknown> = {}
                columnMappings.forEach(mapping => {
                    if (mapping.systemField) {
                        let value = row[mapping.excelColumn]
                        const overrides = valueOverrides[mapping.systemField]
                        if (overrides && typeof value === 'string' && overrides[value]) {
                            value = overrides[value]
                        }
                        mapped[mapping.systemField] = value
                    }
                })
                return mapped
            })

            const token = localStorage.getItem('auth:token')
            const response = await fetch(`${getApiBaseUrl()}/suppliers/validate-import-mapped`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ suppliers: mappedData })
            })

            if (!response.ok) {
                const errorText = await response.text()
                let errorMessage = 'Error al validar proveedores'
                try {
                    const errorJson = JSON.parse(errorText)
                    errorMessage = errorJson.message || errorMessage
                } catch {
                    errorMessage = errorText || `Error ${response.status}: ${response.statusText}`
                }
                throw new Error(errorMessage)
            }

            const result = await response.json()

            if (result.invalidRows && result.invalidRows.length > 0) {
                const processed: ValidationError[] = result.invalidRows.map((row: { rowIndex: number; errors: string[] }) => {
                    const fieldErrors: Record<string, string[]> = {}
                    row.errors.forEach(error => {
                        if (error.includes('nombre')) fieldErrors.name = [...(fieldErrors.name || []), error]
                        else if (error.includes('contacto')) fieldErrors.contact = [...(fieldErrors.contact || []), error]
                        else if (error.includes('telefono')) fieldErrors.phone = [...(fieldErrors.phone || []), error]
                        else if (error.includes('email') || error.includes('Email')) fieldErrors.email = [...(fieldErrors.email || []), error]
                        else if (error.includes('direccion')) fieldErrors.address = [...(fieldErrors.address || []), error]
                        else if (error.includes('categoria') || error.includes('Categoría')) fieldErrors.category = [...(fieldErrors.category || []), error]
                        else if (error.includes('terminos') || error.includes('Términos')) fieldErrors.payment_terms = [...(fieldErrors.payment_terms || []), error]
                        else fieldErrors._general = [...(fieldErrors._general || []), error]
                    })
                    return { rowIndex: row.rowIndex, errors: row.errors, fieldErrors }
                })
                setValidationErrors(processed)
                setValidRowCount(result.totals.valid)
                toast({ title: 'Validación completada', description: `${result.totals.invalid} proveedores con errores`, variant: 'destructive' })
            } else {
                setValidationErrors([])
                setValidRowCount(result.totals.valid)
                toast({ title: '¡Validación exitosa!', description: `Todos los ${result.totals.total} proveedores son válidos.` })
            }

            setHasTestedOnce(true)
            setStep('mapping')
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error al validar proveedores'
            toast({ 
                title: 'Error de validación', 
                description: errorMessage, 
                variant: 'destructive' 
            })
            // Set a general error to display in the UI
            setValidationErrors([{
                rowIndex: -1,
                errors: [errorMessage],
                fieldErrors: { _general: [errorMessage] }
            }])
            setValidRowCount(0)
            setStep('mapping')
        } finally {
            setIsTesting(false)
        }
    }

    const handleImport = async () => {
        if (!workbook || !selectedSheet) return

        setStep('importing')
        setImportProgress(10)

        try {
            const sheet = workbook.Sheets[selectedSheet]
            const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
                header: useFirstRowAsHeader ? undefined : 1,
                defval: ''
            })

            const total = data.length || 1

            const mappedData: Record<string, unknown>[] = []
            data.forEach((row, index) => {
                const mapped: Record<string, unknown> = {}
                columnMappings.forEach(mapping => {
                    if (mapping.systemField) {
                        let value = row[mapping.excelColumn]
                        const overrides = valueOverrides[mapping.systemField]
                        if (overrides && typeof value === 'string' && overrides[value]) {
                            value = overrides[value]
                        }
                        mapped[mapping.systemField] = value
                    }
                })
                mappedData.push(mapped)

                // 10% -> 60% según filas mapeadas
                if (index % 10 === 0) {
                    const progress = 10 + Math.round(((index + 1) / total) * 50)
                    setImportProgress(progress)
                }
            })

            const token = localStorage.getItem('auth:token')
            const response = await fetch(`${getApiBaseUrl()}/suppliers/bulk-import-mapped`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ suppliers: mappedData })
            })

            setImportProgress(80)
            
            if (!response.ok) {
                const errorText = await response.text()
                let errorMessage = 'Error en importación'
                try {
                    const errorJson = JSON.parse(errorText)
                    errorMessage = errorJson.message || errorMessage
                } catch {
                    errorMessage = errorText || `Error ${response.status}: ${response.statusText}`
                }
                throw new Error(errorMessage)
            }

            const result = await response.json()

            setImportProgress(100)
            setImportResult(result)
            setStep('success')
            toast({ title: '¡Importación exitosa!', description: `Se importaron ${result.created} proveedores` })
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Error en importación')
            setStep('error')
        }
    }

    const getFieldErrors = (systemField: string | null): string[] => {
        if (!systemField || !hasTestedOnce) return []
        const allErrors: string[] = []
        validationErrors.forEach(ve => {
            const fieldErrs = ve.fieldErrors[systemField]
            if (fieldErrs) fieldErrs.forEach(e => { if (!allErrors.includes(e)) allErrors.push(e) })
        })
        return allErrors
    }

    const getFieldErrorCount = (systemField: string | null): number => {
        if (!systemField || !hasTestedOnce) return 0
        let count = 0
        validationErrors.forEach(ve => { if (ve.fieldErrors[systemField]?.length) count++ })
        return count
    }

    const hasNotExistsError = (systemField: string | null): boolean => {
        if (!systemField) return false
        return getFieldErrors(systemField).some(e => e.includes('no existe') || e.includes('not exist'))
    }

    const getInvalidValues = (systemField: string | null): string[] => {
        if (!systemField) return []
        const values: string[] = []
        getFieldErrors(systemField).forEach(err => {
            const match = err.match(/"([^"]+)"/)
            if (match && match[1] && !values.includes(match[1])) values.push(match[1])
        })
        return values
    }

    const setValueOverride = (fieldName: string, originalValue: string, replacement: string) => {
        setValueOverrides(prev => ({
            ...prev,
            [fieldName]: { ...(prev[fieldName] || {}), [originalValue]: replacement }
        }))
    }

    // Hints / posibles errores por campo (para sección Comentarios)
    const getFieldHints = (systemField: string | null): string[] => {
        if (!systemField) return []

        switch (systemField) {
            case 'name':
                return [
                    'Debe estar lleno en todas las filas.',
                    'Usa el nombre comercial del proveedor, no abreviaturas confusas.',
                ]
            case 'contact':
                return [
                    'Persona de contacto o área responsable (por ejemplo, Ventas, Compras).',
                    'Evita dejarlo vacío para facilitar la comunicación.',
                ]
            case 'phone':
                return [
                    'Requerido. Incluye código de país si aplica.',
                    'Usa solo números, espacios y signos como + o -, sin texto adicional.',
                ]
            case 'email':
                return [
                    'Requerido y debe tener formato de email válido.',
                    'No puede repetirse en varios proveedores.',
                ]
            case 'address':
                return [
                    'Requerido. Incluye al menos ciudad y zona/barrio.',
                    'Útil para rutas de reparto y reportes por ubicación.',
                ]
            case 'category':
                return [
                    'Debe coincidir exactamente con una categoría de proveedores existente.',
                    'Puedes revisar las categorías válidas en el catálogo antes de importar.',
                ]
            case 'payment_terms':
                return [
                    'Opcional. Debe coincidir con un término de pago existente (por ejemplo, Contado, 15 días).',
                    'Si no existe, créalo primero en catálogos o asígnalo manualmente aquí.',
                ]
            case 'rating':
                return [
                    'Opcional. Usa un número entre 1 y 5, sin texto.',
                    'Se usa para priorizar proveedores en reportes y análisis.',
                ]
            default:
                return []
        }
    }

    // Render success state
    if (step === 'success' && importResult) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-8 text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">¡Importación Exitosa!</h3>
                        <p className="text-muted-foreground mb-4">
                            Se importaron {importResult.created} proveedores.
                            {importResult.skipped && importResult.skipped > 0 && ` ${importResult.skipped} fueron omitidos.`}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={() => navigate('/proveedores')}>Ir a Proveedores</Button>
                            <Button onClick={() => { setStep('mapping'); setImportResult(null) }}>Importar Más</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Render error state
    if (step === 'error') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Error</h3>
                        <p className="text-muted-foreground mb-4">{errorMessage}</p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={() => navigate('/proveedores')}>Cancelar</Button>
                            <Button onClick={() => setStep('mapping')}>Intentar de nuevo</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Render importing state
    if (step === 'importing' || step === 'validating') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-8 text-center">
                        <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Importando proveedores...</h3>
                        <Progress value={importProgress} className="mt-4" />
                        <p className="text-sm text-muted-foreground mt-2">{importProgress}%</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Render mapping UI
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-card">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate('/proveedores')}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleImport}
                                    disabled={
                                        !requiredFieldsMapped ||
                                        isTesting ||
                                        !hasTestedOnce ||
                                        validationErrors.length > 0
                                    }
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Importar
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTest}
                                    disabled={!requiredFieldsMapped || isTesting}
                                >
                                    {isTesting ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Probando...</>
                                    ) : (
                                        'Probar'
                                    )}
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <label className="cursor-pointer">
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Cargar otro archivo
                                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                                    </label>
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => navigate('/proveedores')}>
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Proveedores / Importar un archivo
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Sidebar */}
                    <div className="col-span-3">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Datos a importar</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                    <span className="truncate">{file?.name}</span>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Hoja:</Label>
                                    <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar hoja" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sheetNames.map(name => (
                                                <SelectItem key={name} value={name}>{name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="useHeader"
                                        checked={useFirstRowAsHeader}
                                        onCheckedChange={(checked) => setUseFirstRowAsHeader(checked as boolean)}
                                    />
                                    <Label htmlFor="useHeader" className="text-xs">
                                        Utilizar la primera fila como encabezado
                                    </Label>
                                </div>

                                <HR />

                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">Ayuda</p>
                                    <a href="/api/suppliers/template" className="text-xs text-primary hover:underline block">
                                        📄 Plantilla de importación para proveedores
                                    </a>
                                </div>

                                <HR />

                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">Estado del mapeo</p>
                                    {SYSTEM_FIELDS.filter(f => f.required).map(field => {
                                        const isMapped = columnMappings.some(m => m.systemField === field.id)
                                        return (
                                            <div key={field.id} className="flex items-center gap-2 text-xs">
                                                {isMapped ? (
                                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                ) : (
                                                    <AlertCircle className="h-3 w-3 text-orange-500" />
                                                )}
                                                <span className={isMapped ? 'text-green-600' : 'text-orange-500'}>
                                                    {field.label} {!isMapped && '(requerido)'}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content - Column Mapping */}
                    <div className="col-span-9">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium">Mapeo de columnas</CardTitle>
                                    <Badge variant="outline">
                                        {columnMappings.filter(m => m.systemField).length} / {columnMappings.length} columnas mapeadas
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[calc(100vh-280px)]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[200px]">Columna del archivo</TableHead>
                                                <TableHead className="w-[250px]">Campo del Sistema</TableHead>
                                                <TableHead>Comentarios</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {columnMappings.map((mapping) => {
                                                const field = SYSTEM_FIELDS.find(f => f.id === mapping.systemField)
                                                const errorCount = getFieldErrorCount(mapping.systemField)
                                                const hasNotExists = hasNotExistsError(mapping.systemField)
                                                const invalidValues = getInvalidValues(mapping.systemField)

                                                return (
                                                    <TableRow key={mapping.excelColumn}>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium">{mapping.excelColumn}</p>
                                                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                                                    {mapping.sampleData[0] || '(vacío)'}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={mapping.systemField || 'no-mapear'}
                                                                onValueChange={(val) => handleMappingChange(mapping.excelColumn, val === 'no-mapear' ? null : val)}
                                                            >
                                                                <SelectTrigger className={errorCount > 0 ? 'border-destructive' : ''}>
                                                                    <SelectValue placeholder="No importar" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="no-mapear">No importar</SelectItem>
                                                                    {SYSTEM_FIELDS.map(f => (
                                                                        <SelectItem key={f.id} value={f.id}>
                                                                            {f.label} {f.required && '*'}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-2">
                                                                {field?.required && (
                                                                    <span className="text-xs text-muted-foreground">Requerido</span>
                                                                )}
                                                                {hasTestedOnce && mapping.systemField && errorCount > 0 && (
                                                                    <div className="space-y-1">
                                                                        {getFieldErrors(mapping.systemField).slice(0, 2).map((err, i) => (
                                                                            <p key={i} className="text-xs text-destructive">{err}</p>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {hasNotExists && invalidValues.length > 0 && (
                                                                    <div className="space-y-2 pt-2 border-t">
                                                                        <p className="text-xs font-medium text-orange-600">Asociar manualmente:</p>
                                                                        {invalidValues.map(val => {
                                                                            const options = mapping.systemField === 'category' ? categories : paymentTerms
                                                                            const current = valueOverrides[mapping.systemField!]?.[val] || ''
                                                                            return (
                                                                                <div key={val} className="flex items-center gap-2">
                                                                                    <span className="text-xs text-muted-foreground">"{val}" →</span>
                                                                                    <Popover>
                                                                                        <PopoverTrigger asChild>
                                                                                            <Button variant="outline" size="sm" className="h-7 text-xs flex-1 justify-between">
                                                                                                <span className="truncate">{current || 'Seleccionar...'}</span>
                                                                                                <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />
                                                                                            </Button>
                                                                                        </PopoverTrigger>
                                                                                        <PopoverContent className="w-[200px] p-0" align="start">
                                                                                            <Command>
                                                                                                <CommandInput placeholder="Buscar..." className="h-9" />
                                                                                                <CommandList>
                                                                                                    <CommandEmpty>Sin resultados.</CommandEmpty>
                                                                                                    <CommandGroup>
                                                                                                        {options.map(opt => (
                                                                                                            <CommandItem
                                                                                                                key={opt.id}
                                                                                                                value={opt.name}
                                                                                                                onSelect={() => setValueOverride(mapping.systemField!, val, opt.name)}
                                                                                                            >
                                                                                                                <Check className={cn("mr-2 h-4 w-4", current === opt.name ? "opacity-100" : "opacity-0")} />
                                                                                                                {opt.name}
                                                                                                            </CommandItem>
                                                                                                        ))}
                                                                                                    </CommandGroup>
                                                                                                </CommandList>
                                                                                            </Command>
                                                                                        </PopoverContent>
                                                                                    </Popover>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                )}

                                                                {/* Hints estáticos por campo */}
                                                                {mapping.systemField && getFieldHints(mapping.systemField).length > 0 && (
                                                                    <ul className="text-xs text-muted-foreground space-y-0.5">
                                                                        {getFieldHints(mapping.systemField).map((hint, idx) => (
                                                                            <li key={idx}>• {hint}</li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>

                                {/* Validation Summary */}
                                {hasTestedOnce && (
                                    <div className={`mt-4 p-3 rounded-md ${validationErrors.length > 0 ? 'bg-destructive/10' : 'bg-green-50'}`}>
                                        {validationErrors.length > 0 ? (
                                            <p className="text-sm text-destructive flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                {validationErrors.length} proveedores con errores. Corríjalos antes de importar.
                                            </p>
                                        ) : (
                                            <p className="text-sm text-green-700 flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4" />
                                                ¡Validación exitosa! {validRowCount} proveedores listos para importar.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
