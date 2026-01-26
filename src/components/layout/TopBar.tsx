/**
 * TopBar - Top navigation bar with app launcher trigger
 * Replaces the traditional sidebar with a clean top bar
 */
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppLauncher } from './AppLauncher'
import { appModules, getUserRole } from '@/config/appModules'
import { useCriticalProducts } from '@/hooks/useCriticalProducts'
import { useAuth } from '@/context/useAuth'

export const TopBar = () => {
    const [launcherOpen, setLauncherOpen] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()
    const { user } = getUserRole()
    const { logout } = useAuth()

    // Get critical products for notification badge
    const { data: criticalProducts = [] } = useCriticalProducts()

    // Find current module based on path
    const currentModule = appModules.find(m => m.path === location.pathname)

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <>
            <header className='h-12 sm:h-14 bg-card border-b border-border flex items-center px-2 sm:px-4 gap-2 sm:gap-4 shadow-sm'>
                {/* App Launcher Button */}
                <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setLauncherOpen(true)}
                    className='hover:bg-primary/10 h-9 w-9 sm:h-10 sm:w-10'
                >
                    <Menu className='w-5 h-5' />
                </Button>

                {/* Logo / Brand */}
                <div
                    className='flex items-center gap-2 cursor-pointer'
                    onClick={() => navigate('/')}
                >
                    <div className='w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center'>
                        <span className='text-primary-foreground font-bold text-xs sm:text-sm'>D</span>
                    </div>
                    <span className='font-semibold text-base sm:text-lg hidden xs:inline'>Deposito</span>
                </div>

                {/* Current Module Name - Hidden on mobile */}
                {currentModule && location.pathname !== '/' && (
                    <div className='hidden lg:flex items-center gap-2 ml-4 pl-4 border-l'>
                        {currentModule.icon && (
                            <currentModule.icon className='w-4 h-4 text-muted-foreground' />
                        )}
                        <span className='text-sm font-medium text-muted-foreground'>
                            {currentModule.label}
                        </span>
                    </div>
                )}

                {/* Spacer */}
                <div className='flex-1' />

                {/* Alerts Button */}
                <Button
                    variant='ghost'
                    size='icon'
                    className='relative'
                    onClick={() => navigate('/alertas')}
                >
                    <Bell className='w-5 h-5' />
                    {criticalProducts.length > 0 && (
                        <Badge
                            variant='destructive'
                            className='absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs'
                        >
                            {criticalProducts.length > 9 ? '9+' : criticalProducts.length}
                        </Badge>
                    )}
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon' className='rounded-full'>
                            <div className='w-8 h-8 bg-secondary rounded-full flex items-center justify-center'>
                                <User className='w-4 h-4' />
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-56'>
                        <DropdownMenuLabel>
                            <div className='flex flex-col'>
                                <span>{user?.name || 'Usuario'}</span>
                                <span className='text-xs font-normal text-muted-foreground'>
                                    {user?.email || user?.role?.name || 'Sin rol'}
                                </span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className='text-destructive'>
                            <LogOut className='w-4 h-4 mr-2' />
                            Cerrar Sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            {/* App Launcher Modal */}
            <AppLauncher open={launcherOpen} onOpenChange={setLauncherOpen} />
        </>
    )
}

export default TopBar
