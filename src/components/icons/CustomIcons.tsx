/**
 * Custom SVG icons for navigation
 * These icons replace the default Lucide icons for main modules
 */
import { forwardRef, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
    className?: string
}

// Dashboard - House icon
export const DashboardIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Techo */}
            <path d="M3 11L12 3L21 11" />
            {/* Cuerpo de la casa */}
            <path d="M5 10V21H19V10" />
            {/* Puerta */}
            <path d="M10 21V14H14V21" />
        </svg>
    )
)
DashboardIcon.displayName = 'DashboardIcon'

// Ventas - Shopping cart icon
export const VentasIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Asa del carrito */}
            <path d="M3 4H5L7 16H18" />
            {/* Cuerpo del carrito */}
            <path d="M7 8H20L18 16H7" />
            {/* Ruedas */}
            <circle cx="9" cy="19" r="1.5" />
            <circle cx="17" cy="19" r="1.5" />
        </svg>
    )
)
VentasIcon.displayName = 'VentasIcon'

// Inventario - Box/package icon
export const InventarioIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Caja */}
            <path d="M3 7L12 3L21 7L12 11L3 7Z" />
            {/* Laterales */}
            <path d="M3 7V17L12 21V11" />
            <path d="M21 7V17L12 21" />
            {/* Línea central (stock) */}
            <path d="M12 11V21" />
        </svg>
    )
)
InventarioIcon.displayName = 'InventarioIcon'

// Devoluciones - Box with return arrow icon
export const DevolucionesIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Caja */}
            <path d="M3 7L12 3L21 7L12 11L3 7Z" />
            <path d="M3 7V17L12 21V11" />
            <path d="M21 7V13" />
            {/* Flecha de devolución */}
            <path d="M21 16H14" />
            <path d="M17 13L14 16L17 19" />
        </svg>
    )
)
DevolucionesIcon.displayName = 'DevolucionesIcon'

// Cierre de Caja - Calculator icon
export const CierreCajaIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Cuerpo de la calculadora */}
            <rect x="5" y="3" width="14" height="18" rx="2" />
            {/* Pantalla */}
            <rect x="8" y="6" width="8" height="3" rx="1" />
            {/* Botones */}
            <path d="M8 12H8.01" />
            <path d="M12 12H12.01" />
            <path d="M16 12H16.01" />
            <path d="M8 16H8.01" />
            <path d="M12 16H12.01" />
            <path d="M16 16H16.01" />
        </svg>
    )
)
CierreCajaIcon.displayName = 'CierreCajaIcon'

// Proveedores - Person with package icon
export const ProveedoresIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Persona */}
            <circle cx="8" cy="7" r="3" />
            <path d="M3 17C3 14.5 5.5 13 8 13C10.5 13 13 14.5 13 17" />
            {/* Caja */}
            <path d="M14 10L19 8L23 10L19 12L14 10Z" />
            <path d="M14 10V16L19 19V12" />
            <path d="M23 10V16L19 19" />
        </svg>
    )
)
ProveedoresIcon.displayName = 'ProveedoresIcon'

// Análisis - Bar chart icon
export const AnalyticsIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Eje X */}
            <path d="M3 20L21 20" />
            {/* Barras del gráfico */}
            <path d="M6 16V20" />
            <path d="M10 12V20" />
            <path d="M14 8V20" />
            <path d="M18 4V20" />
        </svg>
    )
)
AnalyticsIcon.displayName = 'AnalyticsIcon'

// Reportes - Document icon
export const ReportesIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Documento */}
            <path d="M14 2H6C5.4 2 5 2.4 5 3V21C5 21.6 5.4 22 6 22H18C18.6 22 19 21.6 19 21V8L14 2Z" />
            {/* Líneas de texto */}
            <path d="M14 2V8H19" />
            <path d="M8 12H16" />
            <path d="M8 16H16" />
            <path d="M8 20H12" />
        </svg>
    )
)
ReportesIcon.displayName = 'ReportesIcon'

// Alertas - Triangle warning icon
export const AlertasIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Triángulo */}
            <path d="M12 3L2 21H22L12 3Z" />
            {/* Línea de advertencia */}
            <path d="M12 9V13" />
            {/* Punto de exclamación */}
            <path d="M12 17H12.01" />
        </svg>
    )
)
AlertasIcon.displayName = 'AlertasIcon'

// Scanner - Barcode scanner icon
export const ScannerIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Marco del scanner */}
            <rect x="3" y="5" width="18" height="14" rx="2" />
            {/* Líneas del código de barras */}
            <path d="M6 9H6.01" />
            <path d="M8 9H10" />
            <path d="M12 9H12.01" />
            <path d="M14 9H16" />
            <path d="M18 9H18.01" />
            <path d="M6 13H8" />
            <path d="M10 13H10.01" />
            <path d="M12 13H14" />
            <path d="M16 13H18" />
            <path d="M6 17H6.01" />
            <path d="M8 17H10" />
            <path d="M12 17H14" />
            <path d="M16 17H18.01" />
        </svg>
    )
)
ScannerIcon.displayName = 'ScannerIcon'

// Promociones - Tag/price tag icon
export const PromocionesIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Etiqueta */}
            <path d="M20.59 13.41L13.42 6.24C13.05 5.87 12.55 5.68 12.03 5.68H4C2.9 5.68 2 6.58 2 7.68V15.68C2 16.2 2.19 16.7 2.56 17.07L9.73 20.24C10.1 20.61 10.6 20.8 11.12 20.8C11.64 20.8 12.14 20.61 12.51 20.24L20.59 12.16C21.36 11.39 21.36 10.18 20.59 9.41Z" />
            {/* Círculo de precio */}
            <circle cx="7" cy="7" r="1.5" />
        </svg>
    )
)
PromocionesIcon.displayName = 'PromocionesIcon'

// Catálogos - Folder/Kanban icon
export const CatalogosIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Carpeta */}
            <path d="M4 5C4 4.4 4.4 4 5 4H9L11 6H19C19.6 6 20 6.4 20 7V19C20 19.6 19.6 20 19 20H5C4.4 20 4 19.6 4 19V5Z" />
            {/* Líneas de contenido (kanban) */}
            <path d="M7 10H17" />
            <path d="M7 13H15" />
            <path d="M7 16H13" />
        </svg>
    )
)
CatalogosIcon.displayName = 'CatalogosIcon'

// Usuarios - User with settings icon
export const UsuariosIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ className, ...props }, ref) => (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Usuario */}
            <circle cx="12" cy="8" r="3" />
            <path d="M6 21C6 17.5 8.5 15 12 15C15.5 15 18 17.5 18 21" />
            {/* Engranaje/Configuración */}
            <circle cx="19" cy="5" r="2" />
            <path d="M19 3V7" />
            <path d="M19 3L17 4" />
            <path d="M19 3L21 4" />
        </svg>
    )
)
UsuariosIcon.displayName = 'UsuariosIcon'
