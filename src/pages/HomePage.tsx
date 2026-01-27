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
 * HomePage - Main landing page with app grid (Odoo-style)
 * Shows all available modules in a searchable grid
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getVisibleModules, AppModule, getUserRole } from '@/config/appModules'

const AppCard = ({
    module,
    onClick
}: {
    module: AppModule
    onClick: () => void
}) => {
    const Icon = module.icon

    return (
        <button
            onClick={onClick}
            className={cn(
                'group flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl transition-all duration-300',
                'hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary/50',
                'bg-white shadow-md border border-gray-100'
            )}
        >
            <div className={cn(
                'w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl flex items-center justify-center mb-2 sm:mb-3 transition-transform group-hover:scale-110',
                module.color
            )}>
                <Icon className={cn('w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8', module.iconColor)} />
            </div>
            <span className='text-xs sm:text-sm font-medium text-gray-700 text-center leading-tight'>
                {module.label}
            </span>
        </button>
    )
}

export const HomePage = () => {
    const [search, setSearch] = useState('')
    const navigate = useNavigate()
    const { user, isSeller } = getUserRole()

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
    }

    // Greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Buenos días'
        if (hour < 18) return 'Buenas tardes'
        return 'Buenas noches'
    }

    return (
        <div className='min-h-full bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100'>
            {/* Header area with greeting */}
            <div className='pt-4 sm:pt-6 md:pt-8 pb-2 sm:pb-4 px-3 sm:px-4'>
                <div className='max-w-4xl mx-auto text-center'>
                    <h1 className='text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-1'>
                        {getGreeting()}, {user?.name || 'Usuario'}
                    </h1>
                    <p className='text-xs sm:text-sm md:text-base text-gray-500'>
                        {isSeller ? 'Accede a tus módulos' : 'Selecciona un módulo'}
                    </p>
                </div>
            </div>

            {/* Search bar */}
            <div className='px-3 sm:px-4 pb-4 sm:pb-6 md:pb-8'>
                <div className='max-w-xl mx-auto'>
                    <div className='relative'>
                        <Search className='absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-gray-400' />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder='Buscar...'
                            className='pl-9 sm:pl-12 pr-9 sm:pr-12 py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg bg-white shadow-lg border-0 rounded-lg sm:rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30'
                        />
                        {search && (
                            <Button
                                variant='ghost'
                                size='sm'
                                className='absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 rounded-full'
                                onClick={() => setSearch('')}
                            >
                                <X className='w-3 h-3 sm:w-4 sm:h-4' />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* App Grid */}
            <div className='px-2 sm:px-4 pb-6 sm:pb-8 md:pb-12'>
                <div className='max-w-5xl mx-auto'>
                    {filteredModules.length === 0 ? (
                        <div className='text-center py-12 sm:py-16 text-gray-500'>
                            <p className='text-base sm:text-lg'>No se encontraron módulos</p>
                            <p className='text-xs sm:text-sm mt-1'>Intenta con otro término</p>
                        </div>
                    ) : (
                        <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4'>
                            {filteredModules.map(module => (
                                <AppCard
                                    key={module.id}
                                    module={module}
                                    onClick={() => handleNavigate(module)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default HomePage
