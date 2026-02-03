/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { updateUser, uploadUserPhoto, type User, type UpdateUserPayload, getRoles, type Role } from '@/services/userService'
import { Edit, Upload, Loader2, User as UserIcon, Mail, Phone, MapPin, Calendar, Briefcase } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface UserDetailDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export function UserDetailDialog({ user, open, onOpenChange, onUpdate }: UserDetailDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  
  // Estados del formulario
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editIsEmployee, setEditIsEmployee] = useState(false)
  const [editHireDate, setEditHireDate] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRoleId, setEditRoleId] = useState<string>('')

  // Cargar roles
  useEffect(() => {
    const loadRoles = async () => {
      setIsLoadingRoles(true)
      try {
        const rolesData = await getRoles()
        setRoles(rolesData)
      } catch (error) {
        console.error('Error loading roles:', error)
      } finally {
        setIsLoadingRoles(false)
      }
    }
    if (open) {
      loadRoles()
    }
  }, [open])

  // Inicializar valores cuando se abre el diálogo o cambia el usuario
  useEffect(() => {
    if (user && open) {
      setEditName(user.name)
      setEditEmail(user.email)
      setEditPhone(user.phone || '')
      setEditAddress(user.address || '')
      setEditIsEmployee(user.is_employee || false)
      setEditHireDate(user.hire_date ? format(new Date(user.hire_date), 'yyyy-MM-dd') : '')
      setEditPassword('')
      setEditRoleId(String(user.role_id))
      setIsEditing(false)
    }
  }, [user, open])

  const handleClose = () => {
    setIsEditing(false)
    onOpenChange(false)
  }

  const handleUploadPhoto = async (file: File) => {
    if (!user) return

    setIsUploading(true)
    try {
      // Subir foto usando el endpoint del backend
      const updatedUser = await uploadUserPhoto(user.id, file)
      
      toast({
        title: 'Foto actualizada',
        description: 'La foto del usuario se ha actualizado correctamente'
      })

      // Refrescar la lista de usuarios para que se actualice en la tabla
      onUpdate()
    } catch (error) {
      console.error('Error uploading photo:', error)
      const message = error instanceof Error ? error.message : 'No se pudo subir la foto'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Archivo inválido',
          description: 'Solo se permiten archivos de imagen'
        })
        return
      }

      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Archivo muy grande',
          description: 'La imagen no debe exceder 5MB'
        })
        return
      }

      handleUploadPhoto(file)
    }
  }

  const handleSave = async () => {
    if (!user) return

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
        ...(editPassword.trim() ? { password: editPassword } : {})
      }

      await updateUser(user.id, payload)
      
      toast({
        title: 'Usuario actualizado',
        description: 'Los datos del usuario se han actualizado correctamente'
      })

      setIsEditing(false)
      // Refrescar la lista de usuarios
      onUpdate()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar usuario'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) return null

  const displayPhoto = user.photo_url || undefined
  const defaultPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=orange&color=fff&size=200`

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Usuario</DialogTitle>
        </DialogHeader>

        {!isEditing ? (
          // Vista de solo lectura
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Foto */}
            <div className="space-y-4">
              <div className="relative">
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {displayPhoto ? (
                    <img 
                      src={displayPhoto} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = defaultPhoto
                      }}
                    />
                  ) : (
                    <img 
                      src={defaultPhoto} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute bottom-4 right-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Cambiar foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            {/* Información */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Nombre</Label>
                <p className="text-lg font-semibold">{user.name}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <p className="text-base">{user.email}</p>
              </div>

              {user.phone && (
                <div>
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Teléfono
                  </Label>
                  <p className="text-base">{user.phone}</p>
                </div>
              )}

              {user.address && (
                <div>
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Dirección
                  </Label>
                  <p className="text-base">{user.address}</p>
                </div>
              )}

              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Rol
                </Label>
                <p className="text-base">{user.role?.name || 'Sin rol'}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Es Empleado</Label>
                <p className="text-base">{user.is_employee ? 'Sí' : 'No'}</p>
              </div>

              {user.hire_date && (
                <div>
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de Contratación
                  </Label>
                  <p className="text-base">
                    {format(new Date(user.hire_date), 'dd MMMM yyyy', { locale: es })}
                  </p>
                </div>
              )}

              {user.created_at && (
                <div>
                  <Label className="text-sm text-muted-foreground">Fecha de Registro</Label>
                  <p className="text-base text-muted-foreground">
                    {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Vista de edición
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Foto */}
            <div className="space-y-4">
              <div className="relative">
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  {displayPhoto ? (
                    <img 
                      src={displayPhoto} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = defaultPhoto
                      }}
                    />
                  ) : (
                    <img 
                      src={defaultPhoto} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute bottom-4 right-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Cambiar foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            {/* Formulario de edición */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nombre Completo</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="edit-phone">Teléfono</Label>
                <Input
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <Label htmlFor="edit-address">Dirección</Label>
                <Textarea
                  id="edit-address"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Opcional"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-role">Rol</Label>
                <Select value={editRoleId} onValueChange={setEditRoleId} disabled={isLoadingRoles}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingRoles ? "Cargando..." : "Seleccionar rol"} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-hire-date">Fecha de Contratación</Label>
                <Input
                  id="edit-hire-date"
                  type="date"
                  value={editHireDate}
                  onChange={(e) => setEditHireDate(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-is-employee"
                  checked={editIsEmployee}
                  onCheckedChange={(checked) => setEditIsEmployee(checked as boolean)}
                />
                <Label htmlFor="edit-is-employee" className="cursor-pointer">
                  Es empleado
                </Label>
              </div>

              <div>
                <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Dejar vacío para mantener la actual"
                />
              </div>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    Guardar Cambios
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
