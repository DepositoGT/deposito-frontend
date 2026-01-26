/**
 * App configuration for Odoo-style navigation
 * Defines all available modules with their routes, icons, and colors
 */
import {
    DashboardIcon,
    VentasIcon,
    InventarioIcon,
    DevolucionesIcon,
    CierreCajaIcon,
    ProveedoresIcon,
    AnalyticsIcon,
    ReportesIcon,
    AlertasIcon,
    ScannerIcon,
    PromocionesIcon,
    CatalogosIcon,
    UsuariosIcon
} from '@/components/icons/CustomIcons'
import { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react'

// Type for custom SVG icon components
type IconComponent = ForwardRefExoticComponent<SVGProps<SVGSVGElement> & RefAttributes<SVGSVGElement>>

export interface AppModule {
    id: string
    label: string
    path: string
    icon: IconComponent
    color: string       // Background color for the card
    iconColor: string   // Icon color
    adminOnly?: boolean
    sellerAllowed?: boolean
}

export const appModules: AppModule[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: DashboardIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600'
    },
    {
        id: 'sales',
        label: 'Ventas',
        path: '/ventas',
        icon: VentasIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        sellerAllowed: true
    },
    {
        id: 'inventory',
        label: 'Inventario',
        path: '/inventario',
        icon: InventarioIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600'
    },
    {
        id: 'returns',
        label: 'Devoluciones',
        path: '/devoluciones',
        icon: DevolucionesIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600'
    },
    {
        id: 'cash-closure',
        label: 'Cierre de Caja',
        path: '/cierre-caja',
        icon: CierreCajaIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        sellerAllowed: true
    },
    {
        id: 'suppliers',
        label: 'Proveedores',
        path: '/proveedores',
        icon: ProveedoresIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600'
    },
    {
        id: 'analytics',
        label: 'Análisis',
        path: '/analisis',
        icon: AnalyticsIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600'
    },
    {
        id: 'reports',
        label: 'Reportes',
        path: '/reportes',
        icon: ReportesIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600'
    },
    {
        id: 'alerts',
        label: 'Alertas',
        path: '/alertas',
        icon: AlertasIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600'
    },
    {
        id: 'scanner',
        label: 'Scanner',
        path: '/scanner',
        icon: ScannerIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600'
    },
    {
        id: 'promotions',
        label: 'Promociones',
        path: '/promociones',
        icon: PromocionesIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        adminOnly: true
    },
    {
        id: 'catalogs',
        label: 'Catálogos',
        path: '/catalogos',
        icon: CatalogosIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        adminOnly: true
    },
    {
        id: 'users',
        label: 'Usuarios',
        path: '/usuarios',
        icon: UsuariosIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        adminOnly: true
    }
]

/**
 * Get user role from localStorage
 */
export const getUserRole = () => {
    let storedUser = null
    try {
        storedUser = typeof window !== 'undefined' ? localStorage.getItem('auth:user') : null
    } catch {
        storedUser = null
    }
    let parsedUser = null
    try {
        parsedUser = storedUser ? JSON.parse(storedUser) : null
    } catch {
        parsedUser = null
    }
    const roleName = parsedUser?.role?.name ?? parsedUser?.role_name ?? undefined
    const isSeller = typeof roleName === 'string' && ['seller', 'vendedor'].includes(roleName.toLowerCase())
    const isAdmin = typeof roleName === 'string' && roleName.toLowerCase() === 'admin'

    return { roleName, isSeller, isAdmin, user: parsedUser }
}

/**
 * Filter modules based on user role
 */
export const getVisibleModules = () => {
    const { isSeller, isAdmin } = getUserRole()

    if (isSeller) {
        return appModules.filter(m => m.sellerAllowed)
    }

    return appModules.filter(m => !m.adminOnly || isAdmin)
}
