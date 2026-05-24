/**
 * Branding compartido para PDFs (jsPDF): logo + nombre de empresa.
 */
import type jsPDF from 'jspdf'
import { getApiBaseUrl } from '@/services/api'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(blob)
  })
}

/** Carga el logo vía proxy del backend (evita CORS y rasteriza SVG/WebP). */
async function loadLogoFromProxy(): Promise<string | undefined> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/settings/company-logo`, { credentials: 'include' })
    if (!res.ok) return undefined
    const blob = await res.blob()
    if (!blob.size) return undefined
    return blobToDataUrl(blob)
  } catch {
    return undefined
  }
}

export async function loadImageAsDataUrl(url: string): Promise<string | undefined> {
  const proxy = await loadLogoFromProxy()
  if (proxy) return proxy

  const trimmed = url?.trim()
  if (!trimmed) return undefined

  try {
    const res = await fetch(trimmed, { mode: 'cors' })
    if (!res.ok) return undefined
    const blob = await res.blob()
    if (!blob.size) return undefined
    return blobToDataUrl(blob)
  } catch {
    return undefined
  }
}

export function detectImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.includes('image/png')) return 'PNG'
  if (dataUrl.includes('image/webp')) return 'WEBP'
  return 'JPEG'
}

/** Escala la imagen dentro de un rectángulo máximo sin deformar. */
export function fitImageToBox(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (!naturalWidth || !naturalHeight) {
    return { width: maxWidth, height: maxHeight }
  }
  const aspect = naturalWidth / naturalHeight
  let width = maxWidth
  let height = width / aspect
  if (height > maxHeight) {
    height = maxHeight
    width = height * aspect
  }
  return { width, height }
}

function getJsPdfImageDimensions(doc: jsPDF, dataUrl: string): { width: number; height: number } {
  try {
    const props = doc.getImageProperties(dataUrl)
    return { width: props.width, height: props.height }
  } catch {
    return { width: 1, height: 1 }
  }
}

/** Logo centrado respetando proporción. Devuelve alto renderizado. */
export function addJsPdfLogoCentered(
  doc: jsPDF,
  dataUrl: string,
  centerX: number,
  y: number,
  maxWidth: number,
  maxHeight: number
): number {
  const fmt = detectImageFormat(dataUrl)
  const natural = getJsPdfImageDimensions(doc, dataUrl)
  const { width, height } = fitImageToBox(natural.width, natural.height, maxWidth, maxHeight)
  doc.addImage(dataUrl, fmt, centerX - width / 2, y, width, height)
  return height
}

export interface JsPdfBrandingOptions {
  companyName?: string
  logoDataUrl?: string
  pageWidth?: number
  startY?: number
  logoMaxWidth?: number
  logoMaxHeight?: number
}

/** Encabezado centrado con logo opcional. Devuelve la Y siguiente. */
export function addJsPdfCompanyHeader(doc: jsPDF, opts: JsPdfBrandingOptions = {}): number {
  const pageWidth = opts.pageWidth ?? 210
  let y = opts.startY ?? 20
  const centerX = pageWidth / 2

  if (opts.logoDataUrl) {
    try {
      const maxW = opts.logoMaxWidth ?? 40
      const maxH = opts.logoMaxHeight ?? 24
      const h = addJsPdfLogoCentered(doc, opts.logoDataUrl, centerX, y - 2, maxW, maxH)
      y += h + 4
    } catch {
      /* sin logo */
    }
  }

  if (opts.companyName?.trim()) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(opts.companyName.trim(), centerX, y, { align: 'center' })
    y += 8
  }

  doc.setTextColor(0, 0, 0)
  return y
}

export async function resolvePdfLogoDataUrl(logoUrl?: string | null): Promise<string | undefined> {
  return loadImageAsDataUrl(logoUrl ?? '')
}
