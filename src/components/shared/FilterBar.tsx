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
 * FilterBar - Reusable filter bar with search and status filter
 */
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X, RefreshCw } from 'lucide-react'

interface FilterOption {
    value: string
    label: string
}

interface FilterBarProps {
    searchValue: string
    onSearchChange: (value: string) => void
    searchPlaceholder?: string
    statusValue?: string
    onStatusChange?: (value: string) => void
    statusOptions?: FilterOption[]
    statusLabel?: string
    onRefresh?: () => void
    onClear?: () => void
    showClearButton?: boolean
    extraFilters?: React.ReactNode
}

export const FilterBar = ({
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Buscar...',
    statusValue,
    onStatusChange,
    statusOptions,
    statusLabel = 'Estado',
    onRefresh,
    onClear,
    showClearButton = true,
    extraFilters,
}: FilterBarProps) => {
    const hasActiveFilters = searchValue || (statusValue && statusValue !== 'all')

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Search Input */}
            <div className="md:col-span-2">
                <Label className="mb-2 block">Buscar</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10"
                    />
                    {searchValue && showClearButton && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => onSearchChange('')}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Status Filter */}
            {statusOptions && onStatusChange && (
                <div>
                    <Label className="mb-2 block">{statusLabel}</Label>
                    <Select value={statusValue} onValueChange={onStatusChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Extra Filters */}
            {extraFilters}

            {/* Action Buttons */}
            <div className="flex gap-2">
                {onRefresh && (
                    <Button variant="outline" onClick={onRefresh} className="flex-1">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualizar
                    </Button>
                )}
                {onClear && hasActiveFilters && (
                    <Button
                        variant="ghost"
                        onClick={onClear}
                        className="text-muted-foreground"
                    >
                        Limpiar
                    </Button>
                )}
            </div>
        </div>
    )
}
