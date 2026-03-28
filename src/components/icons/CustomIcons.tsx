/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * Iconos de módulos: tema Papirus en color (32×32 apps/places/emblems/mimetypes;
 * devoluciones 24×24 action), copiados en /public/icons/modules.
 */
import { forwardRef, RefAttributes, ForwardRefExoticComponent, type CSSProperties } from 'react'

/** Props compatibles con el uso previo (principalmente className desde Tailwind). */
export type ModuleIconProps = {
    className?: string
    style?: CSSProperties
    id?: string
}

function createModuleIcon(
    src: string,
    displayName: string
): ForwardRefExoticComponent<ModuleIconProps & RefAttributes<HTMLSpanElement>> {
    const Icon = forwardRef<HTMLSpanElement, ModuleIconProps>(function ModuleIcon(
        { className, style, id },
        ref
    ) {
        return (
            <span
                ref={ref}
                id={id}
                className={className}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
                role="img"
                aria-hidden
            >
                <img
                    src={src}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-contain select-none"
                    loading="lazy"
                    decoding="async"
                />
            </span>
        )
    })
    Icon.displayName = displayName
    return Icon
}

const base = '/icons/modules'

// Papirus apps: org.gnome.baobab.svg (resumen / proporciones)
export const DashboardIcon = createModuleIcon(`${base}/dashboard.svg`, 'DashboardIcon')
// Ícono propio estilo Papirus: carrito lateral (ventas)
export const VentasIcon = createModuleIcon(`${base}/ventas.svg`, 'VentasIcon')
// Papirus mimetypes: package.svg (caja / productos)
export const InventarioIcon = createModuleIcon(`${base}/inventario.svg`, 'InventarioIcon')
// Mismo asset que analytics.svg (gráfico de barras / cuadre de cantidades)
export const InventariadoIcon = createModuleIcon(`${base}/inventariado.svg`, 'InventariadoIcon')
// Papirus actions: edit-undo.svg (24px)
export const DevolucionesIcon = createModuleIcon(`${base}/devoluciones.svg`, 'DevolucionesIcon')
// Papirus apps: org.gnome.Calculator.svg (cuadre / aritmética de caja)
export const CierreCajaIcon = createModuleIcon(`${base}/cierre-caja.svg`, 'CierreCajaIcon')
// Papirus apps: kaddressbook.svg
export const ProveedoresIcon = createModuleIcon(`${base}/proveedores.svg`, 'ProveedoresIcon')
// Papirus apps: libreoffice-chart.svg
export const AnalyticsIcon = createModuleIcon(`${base}/analytics.svg`, 'AnalyticsIcon')
// Papirus mimetypes: x-office-spreadsheet.svg
export const ReportesIcon = createModuleIcon(`${base}/reportes.svg`, 'ReportesIcon')
// Papirus apps: gnome-warning.svg
export const AlertasIcon = createModuleIcon(`${base}/alertas.svg`, 'AlertasIcon')
// Papirus apps: org.gnome.SimpleScan.svg
export const ScannerIcon = createModuleIcon(`${base}/scanner.svg`, 'ScannerIcon')
// Papirus app.drey.EarTag + % rojo (etiqueta de oferta / descuento)
export const PromocionesIcon = createModuleIcon(`${base}/promociones.svg`, 'PromocionesIcon')
// Papirus apps: gnome-documents.svg
export const CatalogosIcon = createModuleIcon(`${base}/catalogos.svg`, 'CatalogosIcon')
// Papirus apps: preferences-system-users.svg
export const UsuariosIcon = createModuleIcon(`${base}/usuarios.svg`, 'UsuariosIcon')
// Papirus places: folder-download.svg
export const MercanciaIcon = createModuleIcon(`${base}/mercancia.svg`, 'MercanciaIcon')
// Papirus: preferences-desktop.svg (engranajes / escritorio, ~32px)
export const ConfiguracionIcon = createModuleIcon(`${base}/configuracion.svg`, 'ConfiguracionIcon')
