/**
 * DataTable - Reusable table component with sorting and configurable columns
 */
import { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'

export interface Column<T> {
    key: string
    header: string
    render?: (item: T) => React.ReactNode
    sortable?: boolean
    className?: string
}

interface DataTableProps<T> {
    data: T[]
    columns: Column<T>[]
    keyExtractor: (item: T) => string
    onRowClick?: (item: T) => void
    emptyMessage?: string
    className?: string
}

type SortDirection = 'asc' | 'desc' | null

export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    keyExtractor,
    onRowClick,
    emptyMessage = 'No hay datos disponibles',
    className = '',
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>(null)

    const handleSort = (key: string) => {
        if (sortKey === key) {
            if (sortDirection === 'asc') {
                setSortDirection('desc')
            } else if (sortDirection === 'desc') {
                setSortKey(null)
                setSortDirection(null)
            } else {
                setSortDirection('asc')
            }
        } else {
            setSortKey(key)
            setSortDirection('asc')
        }
    }

    const sortedData = useMemo(() => {
        if (!sortKey || !sortDirection) return data

        return [...data].sort((a, b) => {
            const aVal = a[sortKey]
            const bVal = b[sortKey]

            if (aVal === null || aVal === undefined) return 1
            if (bVal === null || bVal === undefined) return -1

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal)
            }

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
            }

            return 0
        })
    }, [data, sortKey, sortDirection])

    const getSortIcon = (key: string) => {
        if (sortKey !== key) {
            return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
        }
        return sortDirection === 'asc'
            ? <ChevronUp className="ml-2 h-4 w-4" />
            : <ChevronDown className="ml-2 h-4 w-4" />
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                {emptyMessage}
            </div>
        )
    }

    return (
        <div className={`overflow-x-auto ${className}`}>
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((column) => (
                            <TableHead key={column.key} className={column.className}>
                                {column.sortable ? (
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleSort(column.key)}
                                        className="h-auto p-0 font-medium hover:bg-transparent"
                                    >
                                        {column.header}
                                        {getSortIcon(column.key)}
                                    </Button>
                                ) : (
                                    column.header
                                )}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedData.map((item) => (
                        <TableRow
                            key={keyExtractor(item)}
                            onClick={() => onRowClick?.(item)}
                            className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                        >
                            {columns.map((column) => (
                                <TableCell key={column.key} className={column.className}>
                                    {column.render
                                        ? column.render(item)
                                        : String(item[column.key] ?? '')}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
