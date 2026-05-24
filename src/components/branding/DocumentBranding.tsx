/**
 * Sincroniza título y favicon del navegador con la configuración pública.
 */
import { useEffect } from 'react'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { applyDocumentBranding } from '@/utils/documentBranding'

export function DocumentBranding() {
  const { companyName, companyLogoUrl, loading } = useSystemSettings()

  useEffect(() => {
    if (loading) return
    applyDocumentBranding({ companyName, companyLogoUrl })
  }, [companyName, companyLogoUrl, loading])

  return null
}
