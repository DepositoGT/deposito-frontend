/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * This source code is licensed under a Proprietary License.
 */

import { apiFetch } from './api'

export interface SystemSettings {
  currency_code?: string
  currency_name?: string
  timezone?: string
  company_name?: string
  date_format?: string
  locale?: string
  cash_closure_max_diff_pct?: string
  cash_closure_denominations?: { denomination: number; type: string }[]
  // Datos fiscales (FEL)
  company_nit?: string
  company_address?: string
  company_municipality?: string
  company_department?: string
  company_postal_code?: string
  establishment_code?: string
  vat_affiliation?: string
}

export interface DenominationItem {
  denomination: number
  type: 'Billete' | 'Moneda'
  quantity?: number
  subtotal?: number
}

export async function getSettings(): Promise<SystemSettings> {
  return apiFetch<SystemSettings>('/settings')
}

/** Timezone, moneda, company_name y opciones de formato/advertencias para cualquier usuario autenticado. */
export async function getPublicSettings(): Promise<{
  timezone: string
  currency_code: string
  currency_name: string
  company_name: string
  date_format: string
  locale: string
  cash_closure_max_diff_pct: string
}> {
  return apiFetch('/settings/public')
}

/** Nombre de la empresa sin autenticación (p. ej. pantalla de login). */
export async function getCompanyNamePublic(): Promise<{ company_name: string }> {
  const base = import.meta.env.VITE_API_URL ?? ''
  const path = base.endsWith('/') ? base + 'settings/company-name' : base + '/settings/company-name'
  const res = await fetch(path)
  if (!res.ok) return { company_name: 'Deposito' }
  const data = await res.json()
  return { company_name: (data?.company_name && String(data.company_name).trim()) || 'Deposito' }
}

export async function updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  return apiFetch<SystemSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify({ settings }),
  })
}

export async function getDenominations(): Promise<DenominationItem[]> {
  try {
    const data = await apiFetch<DenominationItem[]>('/settings/denominations')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
