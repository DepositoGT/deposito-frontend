/**
 * ImportPage - Advanced import page with column mapping
 * 
 * Features:
 * - Sheet selector for multi-sheet Excel files
 * - Column mapping with system field dropdowns
 * - Preview of first row data per column
 * - Real-time validation feedback
 */
import { useState, useEffect, useMemo } from 'react'
import { getApiBaseUrl } from '@/services/api'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
    X,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Loader2,
    HelpCircle,
    FileUp,
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

// System fields available for mapping
const SYSTEM_FIELDS = [
    { id: 'name', label: 'Nombre', required: true, type: 'string' },
    { id: 'category', label: 'Categoría', required: true, type: 'relation' },
    { id: 'supplier', label: 'Proveedor', required: true, type: 'relation' },
    { id: 'price', label: 'Precio', required: true, type: 'number' },
    { id: 'cost', label: 'Costo', required: false, type: 'number' },
    { id: 'stock', label: 'Stock', required: false, type: 'number' },
    { id: 'min_stock', label: 'Stock Mínimo', required: false, type: 'number' },
    { id: 'brand', label: 'Marca', required: false, type: 'string' },
    { id: 'size', label: 'Tamaño', required: false, type: 'string' },
    { id: 'barcode', label: 'Código de Barras', required: false, type: 'string' },
    { id: 'description', label: 'Descripción', required: false, type: 'string' },
]

interface ColumnMapping {
    excelColumn: string
    systemField: string | null
    sampleData: string[]
}

type ImportStep = 'mapping' | 'testing' | 'validating' | 'importing' | 'success' | 'error'

// Validation error per row with field-specific errors
interface ValidationError {
    rowIndex: number
    errors: string[]
    fieldErrors: Record<string, string[]>  // field name -> errors
}

export default function ImportPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
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
    const [generalErrors, setGeneralErrors] = useState<string[]>([])
    const [validRowCount, setValidRowCount] = useState(0)
    const [totalRowCount, setTotalRowCount] = useState(0)

    // Catalog data for manual association
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
    const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([])

    // Value overrides - map invalid values to valid ones
    // Format: { fieldName: { originalValue: replacementValue } }
    const [valueOverrides, setValueOverrides] = useState<Record<string, Record<string, string>>>({})

    // Check for file in sessionStorage on mount
    useEffect(() => {
        const storedFileName = sessionStorage.getItem('import:fileName')
        const storedFileData = sessionStorage.getItem('import:fileData')

        if (storedFileName && storedFileData) {
            try {
                // Convert base64 back to ArrayBuffer
                const binaryString = atob(storedFileData)
                const bytes = new Uint8Array(binaryString.length)
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i)
                }

                const wb = XLSX.read(bytes.buffer, { type: 'array' })
                setWorkbook(wb)
                setSheetNames(wb.SheetNames)
                setSelectedSheet(wb.SheetNames[0])

                // Create a mock file object for display
                setFile({ name: storedFileName } as File)

                // Clear sessionStorage
                sessionStorage.removeItem('import:fileName')
                sessionStorage.removeItem('import:fileData')
            } catch (err) {
                console.error('Error loading file from sessionStorage:', err)
                navigate('/inventario')
            }
        } else {
            // No file provided, redirect back
            navigate('/inventario')
        }
    }, [navigate])

    // Fetch categories and suppliers for manual association
    useEffect(() => {
        const fetchCatalogs = async () => {
            try {
                const token = localStorage.getItem('auth:token')
                const headers = { 'Authorization': `Bearer ${token}` }

                const [catRes, supRes] = await Promise.all([
                    fetch('/api/catalogs/product-categories', { headers }),
                    fetch('/api/suppliers', { headers })
                ])

                if (catRes.ok) {
                    const catData = await catRes.json()
                    console.log('Categories loaded:', catData)
                    if (Array.isArray(catData)) {
                        setCategories(catData.map((c: { id: number; name: string }) => ({ id: c.id, name: c.name })))
                    }
                }
                if (supRes.ok) {
                    const supData = await supRes.json()
                    console.log('Suppliers loaded:', supData)
                    if (Array.isArray(supData)) {
                        setSuppliers(supData.map((s: { id: number; name: string }) => ({ id: s.id, name: s.name })))
                    }
                }
            } catch (err) {
                console.error('Error fetching catalogs:', err)
            }
        }
        fetchCatalogs()
    }, [])

    // Parse selected sheet and extract columns
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

        // Get column names from first row keys
        const columns = Object.keys(data[0])

        // Create mappings with sample data
        const mappings: ColumnMapping[] = columns.map(col => {
            const samples = data.slice(0, 3).map(row => String(row[col] || ''))

            // Auto-detect mapping based on column name
            const lowerCol = col.toLowerCase().trim()
            let autoField: string | null = null

            if (lowerCol.includes('nombre') || lowerCol === 'name') autoField = 'name'
            else if (lowerCol.includes('categor')) autoField = 'category'
            else if (lowerCol.includes('proveedor') || lowerCol.includes('supplier')) autoField = 'supplier'
            else if (lowerCol.includes('precio') || lowerCol === 'price') autoField = 'price'
            else if (lowerCol.includes('costo') || lowerCol === 'cost') autoField = 'cost'
            else if (lowerCol.includes('stock') && !lowerCol.includes('min')) autoField = 'stock'
            else if (lowerCol.includes('stock_min') || lowerCol.includes('minimo')) autoField = 'min_stock'
            else if (lowerCol.includes('marca') || lowerCol === 'brand') autoField = 'brand'
            else if (lowerCol.includes('tama') || lowerCol === 'size') autoField = 'size'
            else if (lowerCol.includes('codigo') || lowerCol.includes('barcode') || lowerCol.includes('barras')) autoField = 'barcode'
            else if (lowerCol.includes('descr')) autoField = 'description'

            return {
                excelColumn: col,
                systemField: autoField,
                sampleData: samples
            }
        })

        setColumnMappings(mappings)
    }, [workbook, selectedSheet, useFirstRowAsHeader])

    // Check if required fields are mapped
    const requiredFieldsMapped = useMemo(() => {
        const mappedFields = columnMappings.map(m => m.systemField).filter(Boolean)
        return SYSTEM_FIELDS
            .filter(f => f.required)
            .every(f => mappedFields.includes(f.id))
    }, [columnMappings])

    // Update a column mapping
    const updateMapping = (excelColumn: string, systemField: string | null) => {
        setColumnMappings(prev => prev.map(m =>
            m.excelColumn === excelColumn
                ? { ...m, systemField }
                : m
        ))
    }

    // Handle file drop (for re-upload)
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const selectedFile = files[0]
        setFile(selectedFile)

        try {
            const buffer = await selectedFile.arrayBuffer()
            const wb = XLSX.read(buffer, { type: 'array' })
            setWorkbook(wb)
            setSheetNames(wb.SheetNames)
            setSelectedSheet(wb.SheetNames[0])
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo leer el archivo'
            })
        }
    }

    // Execute import with current mappings
    const handleImport = async () => {
        if (!workbook || !selectedSheet) return

        setStep('validating')
        setImportProgress(10)

        try {
            // Get sheet data
            const sheet = workbook.Sheets[selectedSheet]
            const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
                header: useFirstRowAsHeader ? undefined : 1,
                defval: ''
            })

            setImportProgress(30)

            // Transform data using mappings and apply value overrides
            const mappedData = data.map(row => {
                const mapped: Record<string, unknown> = {}
                columnMappings.forEach(mapping => {
                    if (mapping.systemField) {
                        let value = row[mapping.excelColumn]

                        // Apply value override if set (for manual entity association)
                        const overrides = valueOverrides[mapping.systemField]
                        if (overrides && typeof value === 'string' && overrides[value]) {
                            value = overrides[value]
                        }

                        mapped[mapping.systemField] = value
                    }
                })
                return mapped
            })

            setStep('importing')
            setImportProgress(50)

            // Send to server for validation and import
            const token = localStorage.getItem('auth:token')
            const response = await fetch(`${getApiBaseUrl()}/products/bulk-import-mapped`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ products: mappedData })
            })

            setImportProgress(80)

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Error en importación')
            }

            setImportProgress(100)
            setImportResult(result)
            setStep('success')

            toast({
                title: '¡Importación exitosa!',
                description: `Se importaron ${result.created} productos`
            })

        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Error en importación')
            setStep('error')
        }
    }

    // Test/Validate data without importing
    const handleTest = async () => {
        if (!workbook || !selectedSheet) return

        setIsTesting(true)
        setValidationErrors([])
        setGeneralErrors([])

        try {
            const sheet = workbook.Sheets[selectedSheet]
            const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
                header: useFirstRowAsHeader ? undefined : 1,
                defval: ''
            })

            setTotalRowCount(data.length)

            // Transform data using mappings and apply value overrides
            const mappedData = data.map(row => {
                const mapped: Record<string, unknown> = {}
                columnMappings.forEach(mapping => {
                    if (mapping.systemField) {
                        let value = row[mapping.excelColumn]

                        // Apply value override if set
                        const overrides = valueOverrides[mapping.systemField]
                        if (overrides && typeof value === 'string' && overrides[value]) {
                            value = overrides[value]
                        }

                        mapped[mapping.systemField] = value
                    }
                })
                return mapped
            })

            // Send to server for validation only
            const token = localStorage.getItem('auth:token')
            const response = await fetch(`${getApiBaseUrl()}/products/validate-import-mapped`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ products: mappedData })
            })

            const result = await response.json()

            if (result.invalidRows && result.invalidRows.length > 0) {
                // Process errors and extract field-specific errors
                const processed: ValidationError[] = result.invalidRows.map((row: { rowIndex: number; errors: string[] }) => {
                    const fieldErrors: Record<string, string[]> = {}

                    // Parse errors to extract field names
                    row.errors.forEach(error => {
                        if (error.includes('nombre')) fieldErrors.name = [...(fieldErrors.name || []), error]
                        else if (error.includes('categoria') || error.includes('Categoría')) fieldErrors.category = [...(fieldErrors.category || []), error]
                        else if (error.includes('proveedor') || error.includes('Proveedor')) fieldErrors.supplier = [...(fieldErrors.supplier || []), error]
                        else if (error.includes('precio')) fieldErrors.price = [...(fieldErrors.price || []), error]
                        else if (error.includes('costo')) fieldErrors.cost = [...(fieldErrors.cost || []), error]
                        else if (error.includes('stock') && !error.includes('mínimo')) fieldErrors.stock = [...(fieldErrors.stock || []), error]
                        else if (error.includes('stock mínimo') || error.includes('minimo')) fieldErrors.min_stock = [...(fieldErrors.min_stock || []), error]
                        else if (error.includes('código') || error.includes('barras')) fieldErrors.barcode = [...(fieldErrors.barcode || []), error]
                        else {
                            // General error for this row
                            fieldErrors._general = [...(fieldErrors._general || []), error]
                        }
                    })

                    return {
                        rowIndex: row.rowIndex,
                        errors: row.errors,
                        fieldErrors
                    }
                })

                setValidationErrors(processed)
                setValidRowCount(result.totals?.valid || 0)

                toast({
                    variant: 'destructive',
                    title: 'Errores encontrados',
                    description: `${result.invalidRows.length} filas tienen errores. Revisa la columna de comentarios.`
                })
            } else {
                setValidRowCount(result.totals?.valid || data.length)
                toast({
                    title: '¡Validación exitosa!',
                    description: `Todos los ${data.length} productos son válidos y listos para importar.`
                })
            }

            setHasTestedOnce(true)
        } catch (err) {
            setGeneralErrors([err instanceof Error ? err.message : 'Error en validación'])
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo validar los datos'
            })
        } finally {
            setIsTesting(false)
        }
    }

    // Get errors for a specific column/field
    const getFieldErrors = (systemField: string | null): string[] => {
        if (!systemField || !hasTestedOnce) return []

        const allErrors: string[] = []
        validationErrors.forEach(ve => {
            const fieldErrs = ve.fieldErrors[systemField]
            if (fieldErrs) {
                // Add row number to error
                fieldErrs.forEach(e => {
                    if (!allErrors.includes(e)) allErrors.push(e)
                })
            }
        })
        return allErrors
    }

    // Get count of errors for a field
    const getFieldErrorCount = (systemField: string | null): number => {
        if (!systemField || !hasTestedOnce) return 0

        let count = 0
        validationErrors.forEach(ve => {
            if (ve.fieldErrors[systemField]?.length) count++
        })
        return count
    }

    // Check if field has "not exists" error (category/supplier not found)
    const hasNotExistsError = (systemField: string | null): boolean => {
        if (!systemField) return false
        const errors = getFieldErrors(systemField)
        return errors.some(e => e.includes('no existe') || e.includes('not exist'))
    }

    // Extract invalid values from errors (e.g., "Categoría 'prueba' no existe" -> ["prueba"])
    const getInvalidValues = (systemField: string | null): string[] => {
        if (!systemField) return []
        const errors = getFieldErrors(systemField)
        const values: string[] = []
        errors.forEach(err => {
            const match = err.match(/"([^"]+)"/)
            if (match && match[1] && !values.includes(match[1])) {
                values.push(match[1])
            }
        })
        return values
    }

    // Set value override for a field
    const setValueOverride = (fieldName: string, originalValue: string, replacement: string) => {
        setValueOverrides(prev => ({
            ...prev,
            [fieldName]: {
                ...(prev[fieldName] || {}),
                [originalValue]: replacement
            }
        }))
    }

    // Get available fields (not yet mapped)
    const getAvailableFields = (currentColumn: string) => {
        const usedFields = columnMappings
            .filter(m => m.excelColumn !== currentColumn && m.systemField)
            .map(m => m.systemField)

        return SYSTEM_FIELDS.filter(f => !usedFields.includes(f.id))
    }

    // Render mapping UI
    if (step === 'mapping') {
        return (
            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="border-b bg-card">
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="icon" onClick={() => navigate('/inventario')}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={handleImport}
                                        disabled={!requiredFieldsMapped || isTesting}
                                    >
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
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls,.csv"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => navigate('/inventario')}>
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Productos / Importar un archivo
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
                                    {/* File info */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                        <span className="truncate">{file?.name}</span>
                                    </div>

                                    {/* Sheet selector */}
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

                                    {/* First row as header */}
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

                                    {/* Help section */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground">Ayuda</p>
                                        <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                                            📄 Plantilla de importación para productos
                                        </Button>
                                        <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                                            ❓ Preguntas frecuentes de importación
                                        </Button>
                                    </div>

                                    <HR />

                                    {/* Validation status */}
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
                                                                    value={mapping.systemField || '__none__'}
                                                                    onValueChange={(value) => updateMapping(mapping.excelColumn, value === '__none__' ? null : value)}
                                                                >
                                                                    <SelectTrigger className={!mapping.systemField ? 'border-orange-300 text-orange-600' : ''}>
                                                                        <SelectValue placeholder="Para importar, seleccione un campo..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="__none__">No importar</SelectItem>
                                                                        {getAvailableFields(mapping.excelColumn).map(field => (
                                                                            <SelectItem key={field.id} value={field.id}>
                                                                                {field.label} {field.required && '*'}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </TableCell>
                                                            <TableCell className="min-w-[300px]">
                                                                <div className="space-y-2">
                                                                    {/* Error badge - professional, no emoji */}
                                                                    {hasTestedOnce && mapping.systemField && getFieldErrorCount(mapping.systemField) > 0 && (
                                                                        <Badge variant="destructive" className="text-xs font-medium">
                                                                            {getFieldErrorCount(mapping.systemField)} error(es)
                                                                        </Badge>
                                                                    )}

                                                                    {/* Error messages */}
                                                                    {hasTestedOnce && mapping.systemField && getFieldErrors(mapping.systemField).length > 0 && (
                                                                        <div className="space-y-1">
                                                                            {getFieldErrors(mapping.systemField).slice(0, 2).map((err, i) => (
                                                                                <p key={i} className="text-xs text-red-600">{err}</p>
                                                                            ))}
                                                                            {getFieldErrors(mapping.systemField).length > 2 && (
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    + {getFieldErrors(mapping.systemField).length - 2} error(es) más
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Manual association combobox for "not exists" errors */}
                                                                    {hasTestedOnce && mapping.systemField && hasNotExistsError(mapping.systemField) && (
                                                                        <div className="space-y-2 pt-2 border-t mt-2">
                                                                            <p className="text-xs font-medium text-orange-700">Asociar manualmente:</p>
                                                                            {getInvalidValues(mapping.systemField).map(invalidValue => {
                                                                                const options = mapping.systemField === 'category' ? categories :
                                                                                    mapping.systemField === 'supplier' ? suppliers : []
                                                                                const currentValue = valueOverrides[mapping.systemField!]?.[invalidValue] || ''

                                                                                return (
                                                                                    <div key={invalidValue} className="flex items-center gap-2">
                                                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                                            "{invalidValue}" →
                                                                                        </span>
                                                                                        <Popover>
                                                                                            <PopoverTrigger asChild>
                                                                                                <Button
                                                                                                    variant="outline"
                                                                                                    role="combobox"
                                                                                                    className="h-7 text-xs flex-1 justify-between min-w-[150px]"
                                                                                                >
                                                                                                    <span className="truncate">
                                                                                                        {currentValue || "Buscar y seleccionar..."}
                                                                                                    </span>
                                                                                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                                                                </Button>
                                                                                            </PopoverTrigger>
                                                                                            <PopoverContent className="w-[250px] p-0" align="start">
                                                                                                <Command>
                                                                                                    <CommandInput
                                                                                                        placeholder={`Buscar ${mapping.systemField === 'category' ? 'categoría' : 'proveedor'}...`}
                                                                                                        className="h-9"
                                                                                                    />
                                                                                                    <CommandList>
                                                                                                        <CommandEmpty>Sin resultados.</CommandEmpty>
                                                                                                        <CommandGroup>
                                                                                                            {options.map((opt) => (
                                                                                                                <CommandItem
                                                                                                                    key={opt.id}
                                                                                                                    value={opt.name}
                                                                                                                    onSelect={() => {
                                                                                                                        setValueOverride(mapping.systemField!, invalidValue, opt.name)
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <Check
                                                                                                                        className={cn(
                                                                                                                            "mr-2 h-4 w-4",
                                                                                                                            currentValue === opt.name ? "opacity-100" : "opacity-0"
                                                                                                                        )}
                                                                                                                    />
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

                                                                    {/* Relation hint - show before testing */}
                                                                    {field?.type === 'relation' && !hasTestedOnce && (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Para múltiples valores, sepárelos con coma.
                                                                        </p>
                                                                    )}

                                                                    {/* Required badge */}
                                                                    {field?.required && (
                                                                        <Badge variant="outline" className="text-xs">Requerido</Badge>
                                                                    )}

                                                                    {/* Success indicator */}
                                                                    {hasTestedOnce && mapping.systemField && getFieldErrorCount(mapping.systemField) === 0 && (
                                                                        <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                                                            <CheckCircle2 className="h-3 w-3 mr-1" />Válido
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Loading/importing state
    if (step === 'validating' || step === 'importing') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardContent className="py-12">
                        <div className="flex flex-col items-center gap-6">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <div className="text-center space-y-2">
                                <p className="font-medium">
                                    {step === 'validating' ? 'Validando datos...' : 'Importando productos...'}
                                </p>
                                <Progress value={importProgress} className="w-64" />
                                <p className="text-sm text-muted-foreground">
                                    Por favor, no cierre esta ventana
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Success state
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardContent className="py-12">
                        <div className="flex flex-col items-center gap-6">
                            <div className="p-4 rounded-full bg-green-100">
                                <CheckCircle2 className="h-12 w-12 text-green-600" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-xl font-medium">¡Importación completada!</p>
                                <p className="text-muted-foreground">
                                    Se importaron {importResult?.created || 0} productos exitosamente.
                                    {importResult?.skipped && importResult.skipped > 0 && (
                                        <span className="block mt-1 text-orange-600">
                                            {importResult.skipped} fueron omitidos por errores.
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => navigate('/inventario')}>
                                    Ir al Inventario
                                </Button>
                                <Button onClick={() => { setStep('mapping'); setImportResult(null); setHasTestedOnce(false); setValidationErrors([]); }}>
                                    Importar Más
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Error state
    if (step === 'error') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardContent className="py-12">
                        <div className="flex flex-col items-center gap-6">
                            <div className="p-4 rounded-full bg-red-100">
                                <AlertCircle className="h-12 w-12 text-red-600" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-xl font-medium">Error en la importación</p>
                                <p className="text-muted-foreground">{errorMessage}</p>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => navigate('/inventario')}>
                                    Cancelar
                                </Button>
                                <Button onClick={() => setStep('mapping')}>
                                    Intentar de nuevo
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return null
}

// Helper component
function HR() {
    return <div className="border-t my-3" />
}
