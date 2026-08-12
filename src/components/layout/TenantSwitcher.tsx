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
 * Selector de empresa y sucursal activas. Lo que se elige aquí viaja como
 * X-Company-Id / X-Branch-Id en cada request, así que cambia lo que ve y
 * dónde escribe todo el sistema.
 */
import { Building2, Check, ChevronDown, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTenant } from '@/context/useTenant'
import { CONSOLIDATED } from '@/context/TenantProvider'
import { useAuthPermissions } from '@/hooks/useAuthPermissions'

export const TenantSwitcher = () => {
    const { companies, branches, company, branch, isConsolidated, setCompany, setBranch } = useTenant()
    const { hasPermission } = useAuthPermissions()
    const canViewAll = hasPermission('branches.view_all')

    // Con una sola empresa y una sola sucursal no hay nada que elegir.
    if (companies.length <= 1 && branches.length <= 1 && !canViewAll) return null

    const label = isConsolidated
        ? 'Todas las sucursales'
        : branch?.name ?? 'Sin sucursal'

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type='button'
                    variant='ghost'
                    className='h-10 gap-1.5 rounded-lg border border-transparent px-2 text-foreground hover:bg-muted/70 hover:border-border/60'
                >
                    <Store className='h-4 w-4 text-muted-foreground' />
                    <span className='hidden sm:flex flex-col items-start leading-tight'>
                        <span className='text-[11px] text-muted-foreground'>
                            {company?.name ?? 'Empresa'}
                        </span>
                        <span className='text-sm font-medium max-w-[10rem] truncate'>{label}</span>
                    </span>
                    <ChevronDown className='h-4 w-4 text-muted-foreground' />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align='end' className='w-64'>
                {companies.length > 1 && (
                    <>
                        <DropdownMenuLabel className='flex items-center gap-2 text-xs'>
                            <Building2 className='h-3.5 w-3.5' /> Empresa
                        </DropdownMenuLabel>
                        {companies.map((c) => (
                            <DropdownMenuItem
                                key={c.id}
                                onClick={() => setCompany(c.id)}
                                className='justify-between'
                            >
                                <span className='truncate'>{c.name}</span>
                                {c.id === company?.id && <Check className='h-4 w-4' />}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                    </>
                )}

                <DropdownMenuLabel className='flex items-center gap-2 text-xs'>
                    <Store className='h-3.5 w-3.5' /> Sucursal
                </DropdownMenuLabel>
                {branches.map((b) => (
                    <DropdownMenuItem
                        key={b.id}
                        onClick={() => setBranch(b.id)}
                        className='justify-between'
                    >
                        <span className='truncate'>{b.name}</span>
                        {!isConsolidated && b.id === branch?.id && <Check className='h-4 w-4' />}
                    </DropdownMenuItem>
                ))}

                {canViewAll && branches.length > 1 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setBranch(CONSOLIDATED)}
                            className='justify-between'
                        >
                            <span className='flex flex-col'>
                                <span>Todas las sucursales</span>
                                <span className='text-[11px] text-muted-foreground'>Solo lectura</span>
                            </span>
                            {isConsolidated && <Check className='h-4 w-4' />}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default TenantSwitcher
