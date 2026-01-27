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
 * AppLauncher - Odoo-style app grid modal
 * Shows all available modules in a grid with search functionality
 */
import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getVisibleModules, AppModule } from '@/config/appModules'

interface AppLauncherProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const AppCard = ({
    module,
    isActive,
    onClick
}: {
    module: AppModule
    isActive: boolean
    onClick: () => void
}) => {
    const Icon = module.icon

    return (
        <button
            onClick={onClick}
            className={cn(
                'flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200',
                'hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50',
                module.color,
                isActive && 'ring-2 ring-primary shadow-lg'
            )}
        >
            <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center mb-2',
                'bg-white/60 shadow-sm'
            )}>
                <Icon className={cn('w-6 h-6', module.iconColor)} />
            </div>
            <span className='text-sm font-medium text-gray-700 text-center'>
                {module.label}
            </span>
        </button>
    )
}

export const AppLauncher = ({ open, onOpenChange }: AppLauncherProps) => {
    const [search, setSearch] = useState('')
    const navigate = useNavigate()
    const location = useLocation()

    const modules = useMemo(() => getVisibleModules(), [])

    const filteredModules = useMemo(() => {
        if (!search.trim()) return modules
        const term = search.toLowerCase()
        return modules.filter(m =>
            m.label.toLowerCase().includes(term) ||
            m.id.toLowerCase().includes(term)
        )
    }, [modules, search])

    const handleNavigate = (module: AppModule) => {
        navigate(module.path)
        onOpenChange(false)
        setSearch('')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-3xl p-0 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100'>
                {/* Header with search */}
                <div className='p-4 bg-white border-b'>
                    <div className='relative'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder='Buscar módulos...'
                            className='pl-9 pr-9'
                            autoFocus
                        />
                        {search && (
                            <Button
                                variant='ghost'
                                size='sm'
                                className='absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0'
                                onClick={() => setSearch('')}
                            >
                                <X className='w-4 h-4' />
                            </Button>
                        )}
                    </div>
                </div>

                {/* App Grid */}
                <div className='p-6 max-h-[60vh] overflow-y-auto'>
                    {filteredModules.length === 0 ? (
                        <div className='text-center py-8 text-muted-foreground'>
                            No se encontraron módulos
                        </div>
                    ) : (
                        <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4'>
                            {filteredModules.map(module => (
                                <AppCard
                                    key={module.id}
                                    module={module}
                                    isActive={location.pathname === module.path}
                                    onClick={() => handleNavigate(module)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default AppLauncher
