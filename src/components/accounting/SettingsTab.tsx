/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 *
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CalendarCheck2, Landmark, Lock, LockOpen, Settings2, ShieldAlert } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  getAccountingConfig, updateAccountingConfig, getPeriods, closePeriod, reopenPeriod, closeYear,
  type Account, type AccountingPeriod,
} from '@/services/accountingService'
import { getSettings, updateSettings } from '@/services/settingsService'
import { MONTH_LABELS } from './format'

const KEY_LABELS: Record<string, string> = {
  cash: 'Caja (ventas en efectivo)',
  bank: 'Bancos (tarjeta / transferencia)',
  sales: 'Ventas',
  salesReturns: 'Devoluciones sobre ventas',
  cogs: 'Costo de ventas',
  inventory: 'Inventario',
  payables: 'Proveedores (cuentas por pagar)',
  ivaDebit: 'IVA débito fiscal',
  ivaCredit: 'IVA crédito fiscal',
  currentEarnings: 'Utilidad del ejercicio',
  retainedEarnings: 'Utilidades acumuladas',
}

export const SettingsTab = ({ accounts, canManage }: { accounts: Account[]; canManage: boolean }) => {
  const { toast } = useToast()
  const currentYear = new Date().getFullYear()

  const [defaults, setDefaults] = useState<Record<string, string>>({})
  const [keys, setKeys] = useState<string[]>([])
  const [savingConfig, setSavingConfig] = useState(false)

  const [periodYear, setPeriodYear] = useState(currentYear)
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [busyMonth, setBusyMonth] = useState<number | null>(null)

  const [closingYear, setClosingYear] = useState(currentYear - 1)
  const [closingBusy, setClosingBusy] = useState(false)

  const [vatRegime, setVatRegime] = useState<'general' | 'pequeno'>('general')
  const [savingRegime, setSavingRegime] = useState(false)

  const postables = accounts.filter((a) => a.active && !a.is_group)
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i)

  useEffect(() => {
    getAccountingConfig()
      .then((res) => { setDefaults(res.defaults); setKeys(res.keys) })
      .catch(() => { /* config puede no existir aún */ })
    getSettings()
      .then((s) => setVatRegime(/peque/i.test(s.vat_affiliation || '') ? 'pequeno' : 'general'))
      .catch(() => { /* default: general */ })
  }, [])

  const handleSaveRegime = async (value: 'general' | 'pequeno') => {
    setSavingRegime(true)
    setVatRegime(value)
    try {
      await updateSettings({ vat_affiliation: value === 'pequeno' ? 'Pequeño contribuyente' : 'Régimen general' })
      toast({
        title: 'Régimen de IVA actualizado',
        description: value === 'pequeno'
          ? 'Los próximos asientos se registrarán por totales, sin desglose de IVA'
          : 'Los próximos asientos desglosarán IVA débito y crédito (12%)',
      })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo guardar el régimen', variant: 'destructive' })
    } finally {
      setSavingRegime(false)
    }
  }

  const loadPeriods = (year: number) => {
    getPeriods(year)
      .then((res) => setPeriods(res.items))
      .catch(() => setPeriods([]))
  }
  useEffect(() => { loadPeriods(periodYear) }, [periodYear])

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      await updateAccountingConfig(defaults)
      toast({ title: 'Configuración guardada', description: 'Las cuentas por defecto fueron actualizadas' })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo guardar', variant: 'destructive' })
    } finally {
      setSavingConfig(false)
    }
  }

  const handleTogglePeriod = async (month: number, isClosed: boolean) => {
    if (!isClosed && !window.confirm(`¿Cerrar ${MONTH_LABELS[month - 1]} ${periodYear}? No se podrán registrar asientos en ese mes.`)) return
    setBusyMonth(month)
    try {
      if (isClosed) await reopenPeriod(periodYear, month)
      else await closePeriod(periodYear, month)
      loadPeriods(periodYear)
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo cambiar el período', variant: 'destructive' })
    } finally {
      setBusyMonth(null)
    }
  }

  const handleCloseYear = async () => {
    if (!window.confirm(
      `¿Cerrar el ejercicio ${closingYear}?\n\nSe generará el asiento de cierre que salda ingresos, costos y gastos ` +
      `contra Utilidad del Ejercicio y la traslada a Utilidades Acumuladas. Requiere los 12 meses cerrados.`,
    )) return
    setClosingBusy(true)
    try {
      const entry = await closeYear(closingYear)
      toast({ title: `Ejercicio ${closingYear} cerrado`, description: `Asiento de cierre ${entry.entry_number} generado` })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo cerrar el ejercicio', variant: 'destructive' })
    } finally {
      setClosingBusy(false)
    }
  }

  if (!canManage) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
          <ShieldAlert className="h-8 w-8" />
          No tienes permiso para administrar la configuración contable.
        </CardContent>
      </Card>
    )
  }

  const statusOf = (month: number) => periods.find((p) => p.month === month)?.status ?? 'OPEN'

  return (
    <div className="space-y-6">
      {/* Régimen de IVA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5" />Régimen de IVA (SAT)
          </CardTitle>
          <CardDescription>
            Define cómo se contabilizan las operaciones automáticas. Afecta solo a los asientos futuros.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1 max-w-md">
            <Label className="text-xs">Régimen</Label>
            <Select value={vatRegime} onValueChange={(v) => void handleSaveRegime(v as 'general' | 'pequeno')} disabled={savingRegime}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Régimen general — desglosa IVA débito/crédito (12%)</SelectItem>
                <SelectItem value="pequeno">Pequeño contribuyente — sin desglose, montos totales</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            En régimen general las ventas separan el IVA débito, las compras el IVA crédito, y el costo de
            ventas se registra sin IVA (los costos capturados se asumen a precio de factura, con IVA incluido).
            Como pequeño contribuyente no se acredita IVA: todo se registra por el total. Confírmalo con tu contador.
          </p>
        </CardContent>
      </Card>

      {/* Cuentas por defecto */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5" />Cuentas por defecto
          </CardTitle>
          <CardDescription>Qué cuenta usa cada asiento automático generado por el sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {keys.map((key) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{KEY_LABELS[key] ?? key}</Label>
                <Select
                  value={defaults[key] ?? ''}
                  onValueChange={(v) => setDefaults((prev) => ({ ...prev, [key]: v }))}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                  <SelectContent>
                    {postables.map((a) => (
                      <SelectItem key={a.id} value={a.code}>{a.code} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <Button onClick={handleSaveConfig} disabled={savingConfig}>
            {savingConfig ? 'Guardando…' : 'Guardar configuración'}
          </Button>
        </CardContent>
      </Card>

      {/* Períodos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck2 className="h-5 w-5" />Períodos contables
          </CardTitle>
          <CardDescription>Un período cerrado bloquea la creación de asientos en esas fechas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 w-[140px]">
            <Label className="text-xs">Año</Label>
            <Select value={String(periodYear)} onValueChange={(v) => setPeriodYear(Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MONTH_LABELS.map((label, i) => {
              const month = i + 1
              const closed = statusOf(month) === 'CLOSED'
              return (
                <div key={month} className="rounded-md border p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{label}</p>
                    <Badge variant={closed ? 'secondary' : 'default'} className="mt-1">
                      {closed ? 'Cerrado' : 'Abierto'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground"
                    disabled={busyMonth === month}
                    title={closed ? 'Reabrir' : 'Cerrar'}
                    onClick={() => void handleTogglePeriod(month, closed)}
                  >
                    {closed ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cierre anual */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />Cierre anual
          </CardTitle>
          <CardDescription>
            Genera el asiento de cierre del ejercicio (salda resultados contra Utilidades Acumuladas). Requiere los 12 meses del año cerrados.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 w-[140px]">
            <Label className="text-xs">Ejercicio</Label>
            <Select value={String(closingYear)} onValueChange={(v) => setClosingYear(Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="destructive" onClick={handleCloseYear} disabled={closingBusy}>
            {closingBusy ? 'Cerrando…' : `Cerrar ejercicio ${closingYear}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
