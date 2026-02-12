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
    UsuariosIcon,
    MercanciaIcon
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
    // Permisos (códigos) necesarios para ver este módulo.
    // Si el usuario tiene AL MENOS UNO de estos permisos, el módulo se muestra.
    permissions?: string[]
}

export const appModules: AppModule[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: DashboardIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        // Solo visible si el usuario tiene permisos de analíticas
        permissions: ['analytics.view']
    },
    {
        id: 'sales',
        label: 'Ventas',
        path: '/ventas',
        icon: VentasIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        sellerAllowed: true,
        permissions: ['sales.view', 'sales.create']
    },
    {
        id: 'inventory',
        label: 'Inventario',
        path: '/inventario',
        icon: InventarioIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        permissions: ['products.view']
    },
    {
        id: 'returns',
        label: 'Devoluciones',
        path: '/devoluciones',
        icon: DevolucionesIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        permissions: ['returns.view']
    },
    {
        id: 'cash-closure',
        label: 'Cierre de Caja',
        path: '/cierre-caja',
        icon: CierreCajaIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        sellerAllowed: true,
        permissions: ['cashclosure.view']
    },
    {
        id: 'suppliers',
        label: 'Proveedores',
        path: '/proveedores',
        icon: ProveedoresIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        permissions: ['suppliers.view']
    },
    {
        id: 'merchandise',
        label: 'Mercancía',
        path: '/mercancia',
        icon: MercanciaIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        permissions: ['merchandise.view']
    },
    {
        id: 'analytics',
        label: 'Análisis',
        path: '/analisis',
        icon: AnalyticsIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        permissions: ['analytics.view']
    },
    {
        id: 'reports',
        label: 'Reportes',
        path: '/reportes',
        icon: ReportesIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        permissions: ['reports.view']
    },
    {
        id: 'alerts',
        label: 'Alertas',
        path: '/alertas',
        icon: AlertasIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        permissions: ['alerts.view']
    },
    {
        id: 'promotions',
        label: 'Promociones',
        path: '/promociones',
        icon: PromocionesIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        adminOnly: true,
        permissions: ['promotions.view', 'promotions.manage']
    },
    {
        id: 'catalogs',
        label: 'Catálogos',
        path: '/catalogos',
        icon: CatalogosIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        adminOnly: true,
        permissions: ['catalogs.view']
    },
    {
        id: 'users',
        label: 'Usuarios',
        path: '/usuarios',
        icon: UsuariosIcon,
        color: 'bg-orange-100',
        iconColor: 'text-orange-600',
        adminOnly: true,
        permissions: ['users.view', 'roles.manage']
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
    const { isSeller, isAdmin, user } = getUserRole()
    const hasPermissionsField = Array.isArray(user?.permissions)
    const permissions: string[] = hasPermissionsField
        ? (user!.permissions as unknown[]).map((p) => String(p))
        : []

    // Nuevo sistema de permisos activo (el token ya trae el campo permissions, aunque esté vacío)
    if (hasPermissionsField) {
        // Admin ve todo siempre
        if (isAdmin) {
            return appModules
        }

        // Usuario con campo permissions pero sin ningún permiso asignado:
        // no debe ver ningún módulo.
        if (permissions.length === 0) {
            return []
        }

        // Usuario con uno o más permisos: filtrar por permisos declarados en cada módulo
        return appModules.filter((module) => {
            // Si el módulo define permisos, basta con tener uno de ellos
            if (Array.isArray(module.permissions) && module.permissions.length > 0) {
                return module.permissions.some((code) => permissions.includes(code))
            }

            // Si no define permisos explícitos, respetar adminOnly como fallback
            if (module.adminOnly) {
                return isAdmin
            }

            // Módulo sin restricciones explícitas
            return true
        })
    }

    // Fallback legacy por rol cuando aún no hay campo permissions en el token
    if (isSeller) {
        return appModules.filter(m => m.sellerAllowed)
    }

    return appModules.filter(m => !m.adminOnly || isAdmin)
}

