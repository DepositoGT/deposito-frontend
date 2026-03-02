/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * Contexto de configuración del sistema (timezone, moneda, company_name).
 * Una sola petición GET /api/settings/public por árbol de rutas privadas.
 */

import { createContext, useCallback, useEffect, useState } from 'react'
import { getPublicSettings } from '@/services/settingsService'

const DEFAULT_TIMEZONE = 'America/Guatemala'
const DEFAULT_COMPANY_NAME = 'Deposito'
const DEFAULT_CURRENCY_CODE = 'GTQ'
const DEFAULT_CURRENCY_NAME = 'Quetzal'
const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy'
const DEFAULT_LOCALE = 'es-GT'
const DEFAULT_CASH_CLOSURE_MAX_DIFF_PCT = 5

export interface SystemSettingsState {
  timezone: string
  currencyCode: string
  currencyName: string
  companyName: string
  dateFormat: string
  locale: string
  /** Diferencia máxima permitida en cierre de caja (%) para mostrar advertencia */
  cashClosureMaxDiffPct: number
  loading: boolean
  error: boolean
  /** Recarga la configuración pública desde el servidor (p. ej. tras guardar en Configuración). */
  refetch: () => void
}

const defaultState: Omit<SystemSettingsState, 'refetch'> = {
  timezone: DEFAULT_TIMEZONE,
  currencyCode: DEFAULT_CURRENCY_CODE,
  currencyName: DEFAULT_CURRENCY_NAME,
  companyName: DEFAULT_COMPANY_NAME,
  dateFormat: DEFAULT_DATE_FORMAT,
  locale: DEFAULT_LOCALE,
  cashClosureMaxDiffPct: DEFAULT_CASH_CLOSURE_MAX_DIFF_PCT,
  loading: true,
  error: false
}

export const SystemSettingsContext = createContext<SystemSettingsState | undefined>(undefined)

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<SystemSettingsState, 'refetch'>>(defaultState)

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: false }))
    getPublicSettings()
      .then((d) => {
        const pctRaw = d?.cash_closure_max_diff_pct != null ? String(d.cash_closure_max_diff_pct).trim() : ''
        const pct = pctRaw === '' ? DEFAULT_CASH_CLOSURE_MAX_DIFF_PCT : Math.max(0, parseFloat(pctRaw) || DEFAULT_CASH_CLOSURE_MAX_DIFF_PCT)
        setState({
          timezone: (d?.timezone && String(d.timezone).trim()) || DEFAULT_TIMEZONE,
          currencyCode: (d?.currency_code && String(d.currency_code).trim()) || DEFAULT_CURRENCY_CODE,
          currencyName: (d?.currency_name && String(d.currency_name).trim()) || DEFAULT_CURRENCY_NAME,
          companyName: (d?.company_name && String(d.company_name).trim()) || DEFAULT_COMPANY_NAME,
          dateFormat: (d?.date_format && String(d.date_format).trim()) || DEFAULT_DATE_FORMAT,
          locale: (d?.locale && String(d.locale).trim()) || DEFAULT_LOCALE,
          cashClosureMaxDiffPct: pct,
          loading: false,
          error: false
        })
      })
      .catch(() => {
        setState((s) => ({
          ...s,
          timezone: DEFAULT_TIMEZONE,
          currencyCode: DEFAULT_CURRENCY_CODE,
          currencyName: DEFAULT_CURRENCY_NAME,
          companyName: DEFAULT_COMPANY_NAME,
          dateFormat: DEFAULT_DATE_FORMAT,
          locale: DEFAULT_LOCALE,
          cashClosureMaxDiffPct: DEFAULT_CASH_CLOSURE_MAX_DIFF_PCT,
          loading: false,
          error: true
        }))
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const value: SystemSettingsState = { ...state, refetch: load }

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  )
}
