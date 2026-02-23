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
 * Vista de detalle de usuario: foto a un costado (40%), datos al otro (60%), edición inline.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, Briefcase, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { useAuthPermissions } from '@/hooks/useAuthPermissions'
import { useAuth } from '@/context/useAuth'
import {
  getUserById,
  getRoles,
  updateUser,
  uploadUserPhoto,
  type User,
  type Role,
  type UpdateUserPayload,
} from '@/services/userService'

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user: currentUser } = useAuth()
  const { hasPermission } = useAuthPermissions()

  const canEdit = hasPermission('users.edit')

  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editIsEmployee, setEditIsEmployee] = useState(false)
  const [editHireDate, setEditHireDate] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRoleId, setEditRoleId] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setIsLoading(true)
      try {
        const data = await getUserById(id)
        setUser(data)
      } catch (e) {
        toast({
          title: 'Error',
          description: (e as Error)?.message ?? 'No se pudo cargar el usuario',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, toast])

  useEffect(() => {
    const loadRoles = async () => {
      setIsLoadingRoles(true)
      try {
        const data = await getRoles()
        setRoles(data)
      } catch {
        // ignore
      } finally {
        setIsLoadingRoles(false)
      }
    }
    loadRoles()
  }, [])

  useEffect(() => {
    if (!user) return
    setEditName(user.name)
    setEditEmail(user.email)
    setEditPhone(user.phone ?? '')
    setEditAddress(user.address ?? '')
    setEditIsEmployee(user.is_employee ?? false)
    setEditHireDate(user.hire_date ? format(new Date(user.hire_date), 'yyyy-MM-dd') : '')
    setEditPassword('')
    setEditRoleId(String(user.role_id))
  }, [user])

  const resetEditState = () => {
    if (!user) return
    setEditName(user.name)
    setEditEmail(user.email)
    setEditPhone(user.phone ?? '')
    setEditAddress(user.address ?? '')
    setEditIsEmployee(user.is_employee ?? false)
    setEditHireDate(user.hire_date ? format(new Date(user.hire_date), 'yyyy-MM-dd') : '')
    setEditPassword('')
    setEditRoleId(String(user.role_id))
  }

  const handleSave = async () => {
    if (!user) return
    if (!editName?.trim()) {
      toast({ title: 'Nombre requerido', variant: 'destructive' })
      return
    }
    if (!editEmail?.trim()) {
      toast({ title: 'Email requerido', variant: 'destructive' })
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editEmail)) {
      toast({ title: 'Email inválido', variant: 'destructive' })
      return
    }
    if (editPassword && editPassword.length < 6) {
      toast({ title: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' })
      return
    }
    if (!editRoleId) {
      toast({ title: 'Debe seleccionar un rol', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    try {
      const payload: UpdateUserPayload = {
        name: editName.trim(),
        email: editEmail.trim(),
        role_id: Number(editRoleId),
        is_employee: editIsEmployee,
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
        hire_date: editHireDate || null,
        ...(editPassword.trim() ? { password: editPassword } : {}),
      }
      const updated = await updateUser(user.id, payload)
      setUser(updated)
      setIsEditing(false)
      toast({ title: 'Usuario actualizado', description: 'Los datos se guardaron correctamente.' })
      if (currentUser?.id === user.id) {
        localStorage.setItem('auth:user', JSON.stringify(updated))
        window.dispatchEvent(new CustomEvent('auth:userUpdated', { detail: updated }))
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error)?.message ?? 'No se pudieron guardar los cambios',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Solo se permiten imágenes', variant: 'destructive' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'La imagen no debe exceder 5MB', variant: 'destructive' })
      return
    }
    setIsUploading(true)
    try {
      const updated = await uploadUserPhoto(user.id, file)
      setUser(updated)
      toast({ title: 'Foto actualizada', description: 'La foto se actualizó correctamente.' })
      if (currentUser?.id === user.id) {
        localStorage.setItem('auth:user', JSON.stringify(updated))
        window.dispatchEvent(new CustomEvent('auth:userUpdated', { detail: updated }))
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error)?.message ?? 'No se pudo subir la foto',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  if (!id) {
    navigate('/usuarios')
    return null
  }
  if (isLoading && !user) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }
  if (!user) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/usuarios')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="mt-6 text-center text-destructive">Usuario no encontrado.</div>
      </div>
    )
  }

  const displayPhoto = user.photo_url || undefined
  const defaultPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=orange&color=fff&size=200`

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/usuarios')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
            <p className="text-sm text-muted-foreground">Detalle del usuario</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <Card className={isEditing && canEdit ? 'ring-2 ring-liquor-amber/30' : ''}>
        <CardHeader>
          <CardTitle>Información del usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing && canEdit && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsEditing(false); resetEditState(); }} disabled={isSaving}>
                Cancelar cambios
              </Button>
              <Button className="bg-liquor-amber hover:bg-liquor-amber/90 text-white" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Foto - 40% */}
            <div className="lg:col-span-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Foto</p>
              <div className="rounded-md overflow-hidden border border-border bg-muted flex flex-col items-center justify-center p-4">
                <div className="w-full aspect-square max-w-[280px] flex items-center justify-center rounded-lg overflow-hidden bg-muted">
                  {displayPhoto ? (
                    <img
                      src={displayPhoto}
                      alt={user.name}
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultPhoto }}
                    />
                  ) : (
                    <img src={defaultPhoto} alt={user.name} className="w-full h-full object-contain rounded-lg" />
                  )}
                </div>
                {canEdit && (
                  <div className="mt-4 w-full">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      onChange={handlePhotoUpload}
                      className="cursor-pointer"
                    />
                    {isUploading && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Subiendo...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Datos - 60% */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Datos personales</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nombre</Label>
                    {isEditing && canEdit ? (
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
                    ) : (
                      <p className="text-foreground font-medium mt-1">{user.name}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email
                    </Label>
                    {isEditing && canEdit ? (
                      <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1" />
                    ) : (
                      <p className="text-foreground mt-1">{user.email}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Teléfono
                    </Label>
                    {isEditing && canEdit ? (
                      <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Opcional" className="mt-1" />
                    ) : (
                      <p className="text-foreground mt-1">{user.phone || '—'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Rol
                    </Label>
                    {isEditing && canEdit ? (
                      <Select value={editRoleId} onValueChange={setEditRoleId} disabled={isLoadingRoles}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={isLoadingRoles ? 'Cargando...' : 'Seleccionar rol'} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-foreground mt-1">{user.role?.name || 'Sin rol'}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Dirección
                  </Label>
                  {isEditing && canEdit ? (
                    <Textarea value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Opcional" rows={2} className="mt-1 resize-none" />
                  ) : (
                    <p className="text-foreground mt-1">{user.address || '—'}</p>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Label className="text-muted-foreground">Es empleado</Label>
                  {isEditing && canEdit ? (
                    <Checkbox id="edit-is-employee" checked={editIsEmployee} onCheckedChange={(c) => setEditIsEmployee(c === true)} />
                  ) : (
                    <span className="text-foreground">{user.is_employee ? 'Sí' : 'No'}</span>
                  )}
                </div>

                <div className="mt-4">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Fecha de contratación
                  </Label>
                  {isEditing && canEdit ? (
                    <Input type="date" value={editHireDate} onChange={(e) => setEditHireDate(e.target.value)} className="mt-1" />
                  ) : (
                    <p className="text-foreground mt-1">
                      {user.hire_date ? format(new Date(user.hire_date), 'dd MMMM yyyy', { locale: es }) : '—'}
                    </p>
                  )}
                </div>

                {isEditing && canEdit && (
                  <div className="mt-4">
                    <Label className="text-muted-foreground">Nueva contraseña (opcional)</Label>
                    <Input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Dejar vacío para mantener la actual"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              <Separator />

              {user.created_at && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Registro</p>
                  <p className="text-sm text-muted-foreground">
                    Fecha de registro: {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
