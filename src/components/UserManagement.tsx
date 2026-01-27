/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUsers } from "@/hooks/useUsers";
import { useCreateUser } from "@/hooks/useCreateUser";
import { useUpdateUser } from "@/hooks/useUpdateUser";
import { useDeleteUser } from "@/hooks/useDeleteUser";
import { useRoles } from "@/hooks/useRoles";
import { UserPlus, Edit, Trash2, Shield, Mail, User as UserIcon, Search, X } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import type { User } from "@/services/userService";

const UserManagement = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  // Verificar admin de múltiples formas para mayor robustez
  let isAdmin = false;
  
  // Método 1: Desde el contexto
  if (currentUser?.role_id === 1 || currentUser?.role?.id === 1) {
    isAdmin = true;
  }
  
  // Método 2: Por nombre de rol
  if (currentUser?.role?.name?.toLowerCase() === 'admin') {
    isAdmin = true;
  }
  
  // Método 3: Verificar directamente desde localStorage como fallback
  if (!isAdmin) {
    try {
      const storedUser = localStorage.getItem('auth:user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.role_id === 1 || parsed?.role?.id === 1 || parsed?.role?.name?.toLowerCase() === 'admin') {
          isAdmin = true;
        }
      }
    } catch (e) {
      console.error('Error checking admin from localStorage:', e);
    }
  }

  // Queries
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();

  // Mutations
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Estados para modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Estados para formularios
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState<string>("");

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRoleId, setEditRoleId] = useState<string>("");

  // Búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Estados de carga
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Función para resetear formulario de creación
  const resetCreateForm = () => {
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewRoleId("");
  };

  // Función para crear usuario
  const handleCreateUser = async () => {
    // Validaciones
    if (!newName || newName.trim() === "") {
      toast({ 
        title: "Campo requerido", 
        description: "El nombre es obligatorio",
        variant: "destructive" 
      });
      return;
    }

    if (!newEmail || newEmail.trim() === "") {
      toast({ 
        title: "Campo requerido", 
        description: "El email es obligatorio",
        variant: "destructive" 
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({ 
        title: "Email inválido", 
        description: "Por favor ingrese un email válido",
        variant: "destructive" 
      });
      return;
    }

    if (!newPassword || newPassword.trim() === "") {
      toast({ 
        title: "Campo requerido", 
        description: "La contraseña es obligatoria",
        variant: "destructive" 
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({ 
        title: "Contraseña débil", 
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive" 
      });
      return;
    }

    if (!newRoleId) {
      toast({ 
        title: "Campo requerido", 
        description: "Debe seleccionar un rol",
        variant: "destructive" 
      });
      return;
    }

    setIsCreating(true);
    try {
      await createUserMutation.mutateAsync({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role_id: Number(newRoleId),
      });
      toast({ 
        title: "Usuario creado", 
        description: "El usuario ha sido creado exitosamente" 
      });
      resetCreateForm();
      setIsCreateOpen(false);
    } catch (err: unknown) {
      let message = "No se pudo crear el usuario";
      if (err && typeof err === "object" && "message" in err) {
        message = String(err.message) || message;
      }
      toast({ 
        title: "Error", 
        description: message,
        variant: "destructive" 
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Función para abrir modal de edición
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword("");
    setEditRoleId(String(user.role_id));
    setIsEditOpen(true);
  };

  // Función para actualizar usuario
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    // Validaciones
    if (!editName || editName.trim() === "") {
      toast({ 
        title: "Campo requerido", 
        description: "El nombre es obligatorio",
        variant: "destructive" 
      });
      return;
    }

    if (!editEmail || editEmail.trim() === "") {
      toast({ 
        title: "Campo requerido", 
        description: "El email es obligatorio",
        variant: "destructive" 
      });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      toast({ 
        title: "Email inválido", 
        description: "Por favor ingrese un email válido",
        variant: "destructive" 
      });
      return;
    }

    if (editPassword && editPassword.length < 6) {
      toast({ 
        title: "Contraseña débil", 
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive" 
      });
      return;
    }

    if (!editRoleId) {
      toast({ 
        title: "Campo requerido", 
        description: "Debe seleccionar un rol",
        variant: "destructive" 
      });
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        name: editName.trim(),
        email: editEmail.trim(),
        role_id: Number(editRoleId),
        ...(editPassword && editPassword.trim() !== "" ? { password: editPassword } : {}),
      };

      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        payload,
      });
      
      toast({ 
        title: "Usuario actualizado", 
        description: "Los datos del usuario han sido actualizados exitosamente" 
      });
      setIsEditOpen(false);
      setSelectedUser(null);
    } catch (err: unknown) {
      let message = "No se pudo actualizar el usuario";
      if (err && typeof err === "object" && "message" in err) {
        message = String(err.message) || message;
      }
      toast({ 
        title: "Error", 
        description: message,
        variant: "destructive" 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Función para eliminar usuario
  const handleDeleteUser = async (userId: string) => {
    // No permitir eliminar el usuario actual
    if (currentUser?.id === userId) {
      toast({ 
        title: "Acción no permitida", 
        description: "No puedes eliminar tu propia cuenta",
        variant: "destructive" 
      });
      return;
    }

    setDeletingUserId(userId);
    try {
      await deleteUserMutation.mutateAsync(userId);
      toast({ 
        title: "Usuario eliminado", 
        description: "El usuario ha sido eliminado correctamente" 
      });
    } catch (err: unknown) {
      let message = "No se pudo eliminar el usuario";
      if (err && typeof err === "object" && "message" in err) {
        message = String(err.message) || message;
      }
      toast({ 
        title: "Error", 
        description: message,
        variant: "destructive" 
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  // Filtrar usuarios
  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === "all" || String(user.role_id) === filterRole;

    return matchesSearch && matchesRole;
  });

  // Función para obtener el badge del rol
  const getRoleBadge = (roleName: string) => {
    const roleColors: Record<string, string> = {
      admin: "bg-red-100 text-red-800 border-red-200",
      manager: "bg-blue-100 text-blue-800 border-blue-200",
      seller: "bg-green-100 text-green-800 border-green-200",
      vendedor: "bg-green-100 text-green-800 border-green-200",
    };

    const colorClass = roleColors[roleName.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200";

    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${colorClass}`}>
        {roleName}
      </span>
    );
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
            <p className="text-muted-foreground">
              Solo los administradores pueden acceder a la gestión de usuarios
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        <Button
          className="bg-liquor-amber hover:bg-liquor-amber/90 text-white"
          onClick={() => setIsCreateOpen(true)}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u: User) => u.role?.name?.toLowerCase() === 'admin').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u: User) => ['seller', 'vendedor'].includes(u.role?.name?.toLowerCase() || '')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
          <CardDescription>
            {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando usuarios...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron usuarios
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Usuario</th>
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-left p-4 font-medium">Rol</th>
                    <th className="text-right p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user: User) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-liquor-amber/10 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-liquor-amber" />
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            {currentUser?.id === user.id && (
                              <span className="text-xs text-muted-foreground">(Tú)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                      </td>
                      <td className="p-4">
                        {getRoleBadge(user.role?.name || 'Sin rol')}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={currentUser?.id === user.id || deletingUserId === user.id}
                              >
                                {deletingUserId === user.id ? (
                                  <>
                                    <svg className="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                    Eliminando...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Eliminar
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar Usuario?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente el usuario "{user.name}" del sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear Usuario */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-name">Nombre Completo</Label>
              <Input
                id="new-name"
                placeholder="Ej: Juan Pérez"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-password">Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-role">Rol</Label>
              <Select value={newRoleId} onValueChange={setNewRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {rolesLoading ? (
                    <SelectItem value="loading" disabled>Cargando...</SelectItem>
                  ) : (
                    roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetCreateForm();
              }}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              className="bg-liquor-amber hover:bg-liquor-amber/90 text-white"
              onClick={handleCreateUser}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Crear Usuario
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Usuario */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          {selectedUser && (
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
                <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Dejar vacío para mantener la actual"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Solo completa este campo si deseas cambiar la contraseña
                </p>
              </div>
              <div>
                <Label htmlFor="edit-role">Rol</Label>
                <Select value={editRoleId} onValueChange={setEditRoleId}>
                  <SelectTrigger>
                    <SelectValue />
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
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              className="bg-liquor-amber hover:bg-liquor-amber/90 text-white"
              onClick={handleUpdateUser}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
