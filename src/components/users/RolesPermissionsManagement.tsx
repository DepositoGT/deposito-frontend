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
import { usePermissions, useRolesWithPermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useAuthPermissions } from "@/hooks/useAuthPermissions";
import type { Role, Permission } from "@/services/userService";
import { deleteRole } from "@/services/userService";
import { Shield, ArrowLeft, CheckSquare, List, LayoutGrid, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

const RolesPermissionsManagement = () => {
  const { hasPermission, isAdmin } = useAuthPermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  const canViewRoles = isAdmin || hasPermission("roles.view") || hasPermission("roles.manage");
  const canManageRoles = isAdmin || hasPermission("roles.manage");

  const { data: allPermissions = [] } = usePermissions();
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    data: rolesData,
    isLoading: rolesLoading,
    refetch: refetchRoles,
  } = useRolesWithPermissions({ page: currentPage, pageSize, enabled: canViewRoles });

  const roles = rolesData?.items || [];

  const groupPermissionsByModule = (permissions: Permission[]) => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      const [module] = perm.code.split(".");
      if (!groups[module]) groups[module] = [];
      groups[module].push(perm);
    });
    return groups;
  };

  const permissionGroups = groupPermissionsByModule(allPermissions);

  const rolePermissionsCount = (role: Role) => role.permissions?.length ?? 0;

  const isProtectedRole = (role: Role) => {
    const name = role.name.toLowerCase();
    return name === "admin" || name === "sin rol";
  };

  const handleDeleteRole = async (
    event: React.MouseEvent<HTMLButtonElement>,
    role: Role,
  ) => {
    event.stopPropagation();

    if (isProtectedRole(role)) {
      toast({
        title: "Rol protegido",
        description: `El rol "${role.name}" no puede eliminarse.`,
        variant: "destructive",
      });
      return;
    }

    const confirmDelete = window.confirm(
      `¿Eliminar el rol "${role.name}"?\n\nLos usuarios que lo tengan quedarán sin rol (asignados a un rol neutro sin permisos) y se eliminarán sus permisos asociados.`,
    );

    if (!confirmDelete) return;

    try {
      setDeletingId(role.id);
      const result = await deleteRole(role.id);

      toast({
        title: "Rol eliminado",
        description:
          result.reassignedUsers && result.reassignedUsers > 0
            ? `Rol eliminado correctamente. ${result.reassignedUsers} usuario(s) fueron movidos a un rol neutro sin permisos.`
            : "Rol eliminado correctamente.",
      });

      await refetchRoles();
    } catch (error: unknown) {
      let message = "No se pudo eliminar el rol";
      if (error && typeof error === "object" && "message" in error) {
        message = String((error as { message?: string }).message) || message;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (!canViewRoles) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
            <p className="text-muted-foreground">
              No tienes permiso para ver roles y permisos
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
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/usuarios")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Usuarios
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Roles y Permisos</h2>
            <p className="text-muted-foreground">
              Lista de roles del sistema. Haz clic en un rol para administrar sus permisos.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canManageRoles && (
            <Button
              className="bg-liquor-amber hover:bg-liquor-amber/90 text-white"
              size="sm"
              onClick={() => navigate("/usuarios/roles-permisos/nuevo")}
            >
              Nuevo rol
            </Button>
          )}
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-9"
          >
            <List className="w-4 h-4 mr-2" />
            Lista
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="h-9"
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            Cuadros
          </Button>
        </div>
      </div>

      {/* Roles existentes */}
      <Card>
        <CardHeader>
          <CardTitle>Roles existentes</CardTitle>
          <CardDescription>
            Ajusta los permisos de cada rol. El rol administrador siempre conserva todos los
            permisos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div className="text-sm text-muted-foreground">Cargando roles...</div>
          ) : roles.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No hay roles configurados o no se pudieron cargar los permisos.
            </div>
          ) : (
            <div className="space-y-4">
              {viewMode === "table" ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-muted-foreground">Rol</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">
                          Permisos
                        </th>
                        {canManageRoles && (
                          <th className="text-right p-3 font-medium text-muted-foreground">
                            Acciones
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((role: Role) => (
                        <tr
                          key={role.id}
                          className="border-b hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigate(`/usuarios/roles-permisos/${role.id}`)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-liquor-amber" />
                              <span className="font-medium">{role.name}</span>
                              {role.name.toLowerCase() === "admin" && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                  Dueño de todo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {rolePermissionsCount(role)} permisos
                          </td>
                          {canManageRoles && (
                            <td className="p-3 text-right">
                              {!isProtectedRole(role) && (
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(event) => handleDeleteRole(event, role)}
                                  disabled={deletingId === role.id}
                                >
                                  {deletingId === role.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {roles.map((role: Role) => (
                    <div
                      key={role.id}
                      onClick={() => navigate(`/usuarios/roles-permisos/${role.id}`)}
                      className="border rounded-lg p-4 text-left hover:bg-muted/60 transition-colors cursor-pointer flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-liquor-amber" />
                          <span className="font-medium">{role.name}</span>
                          {role.name.toLowerCase() === "admin" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                              Dueño de todo
                            </span>
                          )}
                        </div>
                        {canManageRoles && !isProtectedRole(role) && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(event) => handleDeleteRole(event, role)}
                            disabled={deletingId === role.id}
                          >
                            {deletingId === role.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {rolePermissionsCount(role)} permisos asignados
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RolesPermissionsManagement;

