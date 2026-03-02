/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * This source code is licensed under a Proprietary License.
 */

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuthPermissions } from '@/hooks/useAuthPermissions'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { getSettings, updateSettings, type SystemSettings, type DenominationItem } from '@/services/settingsService'
import { Loader2, Save } from 'lucide-react'

const CURRENCIES: { code: string; name: string }[] = [
  { code: 'GTQ', name: 'Quetzal' },
  { code: 'MXN', name: 'Peso mexicano' },
  { code: 'USD', name: 'Dolar estadounidense' },
]

const TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/Guatemala', label: 'Guatemala (America/Guatemala)' },
  { value: 'America/El_Salvador', label: 'El Salvador (America/El_Salvador)' },
  { value: 'UTC', label: 'UTC' },
]

const LOCALES: { value: string; label: string }[] = [
  { value: 'es-GT', label: 'Español (Guatemala)' },
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'en-US', label: 'English (United States)' },
]

const VAT_NONE = '__none__' // Radix Select no permite value=""
const VAT_AFFILIATION_OPTIONS: { value: string; label: string }[] = [
  { value: VAT_NONE, label: '— Seleccione —' },
  { value: 'general', label: 'Régimen general' },
  { value: 'pequeno_contribuyente', label: 'Pequeño contribuyente' },
  { value: 'no_obligado', label: 'No obligado' },
  { value: 'exento', label: 'Exento' },
  { value: 'otro', label: 'Otro' },
]

export default function ConfigManagement() {
  const { toast } = useToast()
  const { hasPermission } = useAuthPermissions()
  const { refetch: refetchSystemSettings } = useSystemSettings()
  const canManage = hasPermission('settings.manage')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SystemSettings>({})
  const [form, setForm] = useState({
    company_name: '',
    currency_code: '',
    currency_name: '',
    timezone: '',
    date_format: 'dd/MM/yyyy',
    locale: 'es-GT',
    cash_closure_max_diff_pct: '5',
  })
  const [fiscalForm, setFiscalForm] = useState({
    company_nit: '',
    company_address: '',
    company_municipality: '',
    company_department: '',
    company_postal_code: '',
    establishment_code: '',
    vat_affiliation: '',
  })
  const [denominations, setDenominations] = useState<DenominationItem[]>([])

  const localePreview = useMemo(() => {
    const loc = form.locale || 'es-GT'
    const currencyCode = form.currency_code === 'US$' ? 'USD' : form.currency_code === 'MX$' ? 'MXN' : form.currency_code === 'Q' ? 'GTQ' : (form.currency_code || 'GTQ')
    try {
      const num = new Intl.NumberFormat(loc, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2 }).format(1234.5)
      const date = new Intl.DateTimeFormat(loc, { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
      return { num, date }
    } catch {
      return { num: '—', date: '—' }
    }
  }, [form.locale, form.currency_code])

  useEffect(() => {
    let cancelled = false
    getSettings()
      .then((data) => {
        if (cancelled) return
        setSettings(data)
        setForm({
          company_name: data.company_name ?? '',
          currency_code: data.currency_code ?? 'GTQ',
          currency_name: data.currency_name ?? 'Quetzal',
          timezone: data.timezone ?? 'America/Guatemala',
          date_format: data.date_format ?? 'dd/MM/yyyy',
          locale: data.locale ?? 'es-GT',
          cash_closure_max_diff_pct: data.cash_closure_max_diff_pct ?? '5',
        })
        if (Array.isArray(data.cash_closure_denominations)) {
          setDenominations(
            data.cash_closure_denominations.map((d) => ({
              denomination: Number(d.denomination) || 0,
              type: d.type === 'Moneda' ? 'Moneda' : 'Billete',
            }))
          )
        }
        setFiscalForm({
          company_nit: data.company_nit ?? '',
          company_address: data.company_address ?? '',
          company_municipality: data.company_municipality ?? '',
          company_department: data.company_department ?? '',
          company_postal_code: data.company_postal_code ?? '',
          establishment_code: data.establishment_code ?? '',
          vat_affiliation: data.vat_affiliation ?? '',
        })
      })
      .catch(() => {
        if (!cancelled) toast({ title: 'Error al cargar configuración', variant: 'destructive' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [toast])

  const handleSaveGeneral = async () => {
    if (!canManage) return
    if (!form.currency_code?.trim()) {
      toast({ title: 'Seleccione una moneda', variant: 'destructive' })
      return
    }
    if (!form.timezone?.trim()) {
      toast({ title: 'Seleccione una zona horaria', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const updated = await updateSettings({
        company_name: form.company_name,
        currency_code: form.currency_code,
        currency_name: form.currency_name,
        timezone: form.timezone,
        date_format: form.date_format,
        locale: form.locale,
        cash_closure_max_diff_pct: form.cash_closure_max_diff_pct,
      })
      setSettings(updated)
      toast({ title: 'Configuración guardada' })
      refetchSystemSettings()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveFiscal = async () => {
    if (!canManage) return
    setSaving(true)
    try {
      await updateSettings({
        company_nit: fiscalForm.company_nit,
        company_address: fiscalForm.company_address,
        company_municipality: fiscalForm.company_municipality,
        company_department: fiscalForm.company_department,
        company_postal_code: fiscalForm.company_postal_code,
        establishment_code: fiscalForm.establishment_code,
        vat_affiliation: fiscalForm.vat_affiliation,
      })
      setSettings((s) => ({ ...s, ...fiscalForm }))
      toast({ title: 'Datos fiscales guardados' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar datos fiscales'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDenominations = async () => {
    if (!canManage) return
    const list = denominations.filter((d) => d.denomination > 0).map((d) => ({ denomination: d.denomination, type: d.type }))
    if (list.length === 0) {
      toast({ title: 'Agregue al menos una denominación con valor mayor a 0', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await updateSettings({ cash_closure_denominations: list })
      setSettings((s) => ({ ...s, cash_closure_denominations: list }))
      toast({ title: 'Denominaciones guardadas' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar denominaciones'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const addDenomination = () => {
    setDenominations((d) => [...d, { denomination: 0, type: 'Billete' }])
  }

  const updateDenomination = (index: number, field: 'denomination' | 'type', value: number | string) => {
    setDenominations((d) => {
      const next = [...d]
      if (field === 'denomination') next[index] = { ...next[index], denomination: Number(value) || 0 }
      else next[index] = { ...next[index], type: value as 'Billete' | 'Moneda' }
      return next
    })
  }

  const removeDenomination = (index: number) => {
    setDenominations((d) => d.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-8 lg:px-14 py-4 sm:py-6 w-full">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Parámetros generales del sistema, moneda, zona horaria y denominaciones para cierre de caja.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="fiscal">Datos fiscales</TabsTrigger>
          <TabsTrigger value="denominations">Cierre de caja (denominaciones)</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Datos generales</CardTitle>
              <CardDescription>Nombre de la empresa, moneda y zona horaria.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="company_name">Nombre de la empresa</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                  placeholder="Mi Empresa"
                  disabled={!canManage}
                />
              </div>
              <div className="grid gap-2">
                <Label>Moneda</Label>
                <Select
                  value={form.currency_code || undefined}
                  onValueChange={(code) => {
                    const cur = CURRENCIES.find((c) => c.code === code)
                    if (cur) setForm((f) => ({ ...f, currency_code: cur.code, currency_name: cur.name }))
                    else setForm((f) => ({ ...f, currency_code: code, currency_name: code }))
                  }}
                  disabled={!canManage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione la moneda">
                      {form.currency_code && !CURRENCIES.some((c) => c.code === form.currency_code)
                        ? `${form.currency_code} – ${form.currency_name || form.currency_code}`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {form.currency_code && !CURRENCIES.some((c) => c.code === form.currency_code) && (
                      <SelectItem value={form.currency_code}>
                        {form.currency_code} – {form.currency_name || form.currency_code}
                      </SelectItem>
                    )}
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} – {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Zona horaria</Label>
                <Select
                  value={form.timezone || undefined}
                  onValueChange={(value) => setForm((f) => ({ ...f, timezone: value }))}
                  disabled={!canManage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione la zona horaria">
                      {form.timezone && !TIMEZONES.some((t) => t.value === form.timezone)
                        ? form.timezone
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {form.timezone && !TIMEZONES.some((t) => t.value === form.timezone) && (
                      <SelectItem value={form.timezone}>{form.timezone}</SelectItem>
                    )}
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date_format">Formato de fecha</Label>
                <Select
                  value={form.date_format || 'dd/MM/yyyy'}
                  onValueChange={(value) => setForm((f) => ({ ...f, date_format: value }))}
                  disabled={!canManage}
                >
                  <SelectTrigger id="date_format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (día/mes/año)</SelectItem>
                    <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (mes/día/año)</SelectItem>
                    <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (ISO)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Locale (números y fechas)</Label>
                <Select
                  value={form.locale || 'es-GT'}
                  onValueChange={(value) => setForm((f) => ({ ...f, locale: value }))}
                  disabled={!canManage}
                >
                  <SelectTrigger id="locale">
                    <SelectValue placeholder="Seleccione el locale">
                      {form.locale && !LOCALES.some((l) => l.value === form.locale)
                        ? form.locale
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {form.locale && !LOCALES.some((l) => l.value === form.locale) && (
                      <SelectItem value={form.locale}>{form.locale}</SelectItem>
                    )}
                    {LOCALES.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ejemplo de cómo se verá en el sistema: montos como <strong>{localePreview.num}</strong> y fechas como <strong>{localePreview.date}</strong> (ventas, inventario, cierre de caja, etc.).
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cash_closure_max_diff_pct">Diferencia máxima en cierre de caja (%)</Label>
                <Input
                  id="cash_closure_max_diff_pct"
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.cash_closure_max_diff_pct}
                  onChange={(e) => setForm((f) => ({ ...f, cash_closure_max_diff_pct: e.target.value }))}
                  placeholder="5"
                  disabled={!canManage}
                />
                <p className="text-xs text-muted-foreground">Si la diferencia supera este %, se pedirá confirmación al guardar.</p>
              </div>
              {canManage && (
                <Button onClick={handleSaveGeneral} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Datos fiscales</CardTitle>
              <CardDescription>
                NIT, dirección y afiliación IVA del emisor. Se usarán en facturación electrónica (FEL).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="company_nit">NIT del emisor</Label>
                <Input
                  id="company_nit"
                  value={fiscalForm.company_nit}
                  onChange={(e) => setFiscalForm((f) => ({ ...f, company_nit: e.target.value }))}
                  placeholder="Ej. 12345678-9"
                  disabled={!canManage}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company_address">Dirección fiscal</Label>
                <Input
                  id="company_address"
                  value={fiscalForm.company_address}
                  onChange={(e) => setFiscalForm((f) => ({ ...f, company_address: e.target.value }))}
                  placeholder="Dirección completa"
                  disabled={!canManage}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="company_municipality">Municipio</Label>
                  <Input
                    id="company_municipality"
                    value={fiscalForm.company_municipality}
                    onChange={(e) => setFiscalForm((f) => ({ ...f, company_municipality: e.target.value }))}
                    disabled={!canManage}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company_department">Departamento</Label>
                  <Input
                    id="company_department"
                    value={fiscalForm.company_department}
                    onChange={(e) => setFiscalForm((f) => ({ ...f, company_department: e.target.value }))}
                    disabled={!canManage}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="company_postal_code">Código postal</Label>
                  <Input
                    id="company_postal_code"
                    value={fiscalForm.company_postal_code}
                    onChange={(e) => setFiscalForm((f) => ({ ...f, company_postal_code: e.target.value }))}
                    disabled={!canManage}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="establishment_code">Código de establecimiento</Label>
                  <Input
                    id="establishment_code"
                    value={fiscalForm.establishment_code}
                    onChange={(e) => setFiscalForm((f) => ({ ...f, establishment_code: e.target.value }))}
                    placeholder="Si aplica (FEL)"
                    disabled={!canManage}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Afiliación IVA</Label>
                <Select
                  value={fiscalForm.vat_affiliation || VAT_NONE}
                  onValueChange={(value) =>
                    setFiscalForm((f) => ({ ...f, vat_affiliation: value === VAT_NONE ? '' : value }))
                  }
                  disabled={!canManage}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione régimen" />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_AFFILIATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canManage && (
                <Button onClick={handleSaveFiscal} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar datos fiscales
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="denominations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Denominaciones para cierre de caja</CardTitle>
              <CardDescription>
                Billetes y monedas que se muestran en el conteo de efectivo al hacer un cierre.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {denominations.map((d, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24"
                      value={d.denomination || ''}
                      onChange={(e) => updateDenomination(i, 'denomination', e.target.value)}
                      disabled={!canManage}
                      placeholder="Valor"
                    />
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3"
                      value={d.type}
                      onChange={(e) => updateDenomination(i, 'type', e.target.value)}
                      disabled={!canManage}
                    >
                      <option value="Billete">Billete</option>
                      <option value="Moneda">Moneda</option>
                    </select>
                    {canManage && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeDenomination(i)}>
                        Quitar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {canManage && (
                <>
                  <Button variant="outline" size="sm" onClick={addDenomination}>
                    Agregar denominación
                  </Button>
                  <div>
                    <Button onClick={handleSaveDenominations} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Guardar denominaciones
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
