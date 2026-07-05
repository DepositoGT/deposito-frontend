/**
 * Pestaña de cajas registradoras (POS) en Datos maestros.
 * Crear cajas, renombrarlas, marcar la predeterminada y activar/desactivar.
 * La asignación de caja a un usuario se hace desde la ficha del usuario.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuthPermissions } from '@/hooks/useAuthPermissions'
import {
  listCashRegisters,
  createCashRegister,
  updateCashRegister,
  type CashRegisterDto,
} from '@/services/cashSessionsService'
import { Pencil, Plus, Loader2, Star, Users } from 'lucide-react'

const REGISTERS_QUERY_KEY = ['cash-registers', 'manage'] as const

type RegisterDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  item?: CashRegisterDto
}

export function CashRegistersTab() {
  const { toast } = useToast()
  const { hasPermission } = useAuthPermissions()
  const canManage = hasPermission('settings.manage')
  const queryClient = useQueryClient()

  const { data: registers = [], isLoading } = useQuery({
    queryKey: REGISTERS_QUERY_KEY,
    queryFn: () => listCashRegisters(true),
  })

  const [dialog, setDialog] = useState<RegisterDialogState>({ open: false, mode: 'create' })
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [saving, setSaving] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cash-registers'] })
    queryClient.invalidateQueries({ queryKey: REGISTERS_QUERY_KEY })
  }

  const openCreate = () => {
    setFormName('')
    setFormCode('')
    setDialog({ open: true, mode: 'create' })
  }

  const openEdit = (item: CashRegisterDto) => {
    setFormName(item.name)
    setFormCode(item.code)
    setDialog({ open: true, mode: 'edit', item })
  }

  const handleSave = async () => {
    const name = formName.trim()
    if (!name) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nombre es requerido' })
      return
    }
    setSaving(true)
    try {
      if (dialog.mode === 'create') {
        await createCashRegister({ name, code: formCode.trim() || undefined })
        toast({ title: 'Caja creada', description: `La caja "${name}" fue creada correctamente` })
      } else if (dialog.item) {
        await updateCashRegister(dialog.item.id, { name })
        toast({ title: 'Caja actualizada', description: `La caja "${name}" fue actualizada` })
      }
      invalidate()
      setDialog({ open: false, mode: 'create' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar la caja',
      })
    } finally {
      setSaving(false)
    }
  }

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => updateCashRegister(id, { is_default: true }),
    onSuccess: () => {
      invalidate()
      toast({ title: 'Caja predeterminada actualizada' })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo cambiar la predeterminada',
      })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateCashRegister(id, { active }),
    onSuccess: (updated) => {
      invalidate()
      toast({
        title: updated.active ? 'Caja activada' : 'Caja desactivada',
        description: `La caja "${updated.name}" fue ${updated.active ? 'activada' : 'desactivada'}`,
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo cambiar el estado',
      })
    },
  })

  return (
    <>
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Cajas registradoras</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Puntos de cobro del POS. Cada usuario puede tener una caja asignada (se configura
                en la ficha del usuario); si no tiene, usa la predeterminada.
              </CardDescription>
            </div>
            {canManage && (
              <Button onClick={openCreate} size="sm" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nueva caja
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando cajas...
            </div>
          ) : registers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay cajas registradas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Usuarios asignados</TableHead>
                    {canManage && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registers.map((reg) => (
                    <TableRow key={reg.id} className={!reg.active ? 'opacity-60' : undefined}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          {reg.name}
                          {reg.is_default && (
                            <Badge variant="secondary" className="gap-1">
                              <Star className="w-3 h-3" />
                              Predeterminada
                            </Badge>
                          )}
                          {reg.has_open_session && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                              Turno abierto
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{reg.code}</TableCell>
                      <TableCell>
                        <Badge variant={reg.active ? 'default' : 'secondary'}>
                          {reg.active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {reg.assigned_users && reg.assigned_users.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            {reg.assigned_users.map((u) => u.name).join(', ')}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            {!reg.is_default && reg.active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Marcar como predeterminada"
                                disabled={setDefaultMutation.isPending}
                                onClick={() => setDefaultMutation.mutate(reg.id)}
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Editar nombre"
                              onClick={() => openEdit(reg)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {!reg.is_default && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={reg.active ? 'text-destructive' : 'text-emerald-600'}
                                disabled={toggleActiveMutation.isPending}
                                onClick={() =>
                                  toggleActiveMutation.mutate({ id: reg.id, active: !reg.active })
                                }
                              >
                                {reg.active ? 'Desactivar' : 'Activar'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.mode === 'create' ? 'Nueva caja' : 'Editar caja'}</DialogTitle>
            <DialogDescription>
              {dialog.mode === 'create'
                ? 'Crea un nuevo punto de cobro para el POS.'
                : 'Cambia el nombre de la caja. El código no se puede modificar.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">Nombre</Label>
              <Input
                id="register-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej. Caja 2, Mostrador, Bodega"
                maxLength={120}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-code">Código</Label>
              <Input
                id="register-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="Se genera del nombre si se deja vacío"
                maxLength={40}
                disabled={dialog.mode === 'edit'}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ open: false, mode: 'create' })}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {dialog.mode === 'create' ? 'Crear caja' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
