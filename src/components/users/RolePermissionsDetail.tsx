/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * Vista de detalle para administrar los permisos de un rol específico.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePermissions, useRoleWithPermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/context/useAuth";
import type { Permission } from "@/services/userService";
import { updateRole } from "@/services/userService";
import { ArrowLeft, Shield, CheckSquare, Loader2 } from "lucide-react";

const RolePermissionsDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const roleId = Number(id);

  // Determinar si el usuario actual es admin
  let isAdmin = false;
  if (currentUser?.role_id === 1 || currentUser?.role?.id === 1) isAdmin = true;
  if (currentUser?.role?.name?.toLowerCase() === "admin") isAdmin = true;
  if (!isAdmin) {
    try {
      const storedUser = localStorage.getItem("auth:user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (
          parsed?.role_id === 1 ||
          parsed?.role?.id === 1 ||
          parsed?.role?.name?.toLowerCase() === "admin"
        ) {
          isAdmin = true;
        }
      }
    } catch {
      // noop
    }
  }

  const { data: allPermissions = [], isLoading: permsLoading } = usePermissions();
  const { data: role, isLoading: roleLoading, refetch } = useRoleWithPermissions(
    Number.isNaN(roleId) ? undefined : roleId,
    isAdmin,
  );

  const [updating, setUpdating] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const groupPermissionsByModule = (permissions: Permission[]) => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      const [module] = perm.code.split(".");
      if (!groups[module]) groups[module] = [];
      groups[module].push(perm);
    });
    return groups;
  };

  const permissionGroups = useMemo(
    () => groupPermissionsByModule(allPermissions),
    [allPermissions],
  );

  // Inicializar permisos seleccionados cuando se carga el rol
  useEffect(() => {
    if (role && Array.isArray(role.permissions)) {
      setSelectedPerms(role.permissions.map((p) => p.code));
    }
  }, [role]);

  const roleHasPermission = (code: string) => {
    return selectedPerms.includes(code);
  };

  const initialPerms = useMemo(() => {
    if (!role || !Array.isArray(role.permissions)) return [];
    return [...role.permissions.map((p) => p.code)].sort();
  }, [role]);

  const isDirty = useMemo(() => {
    const current = [...selectedPerms].sort();
    if (current.length !== initialPerms.length) {
      return current.length !== 0 || initialPerms.length !== 0;
    }
    for (let i = 0; i < current.length; i += 1) {
      if (current[i] !== initialPerms[i]) return true;
    }
    return false;
  }, [selectedPerms, initialPerms]);

  const handleTogglePermission = (code: string) => {
    if (!role) return;

    if (role.name.toLowerCase() === "admin") {
      toast({
        title: "Rol protegido",
        description: "El rol administrador siempre tiene todos los permisos.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPerms((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );
  };

  const handleSave = async () => {
    if (!role || !isDirty) return;

    if (role.name.toLowerCase() === "admin") {
      toast({
        title: "Rol protegido",
        description: "El rol administrador siempre tiene todos los permisos.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      await updateRole(role.id, { permissions: selectedPerms });
      await refetch();
      toast({
        title: "Permisos actualizados",
        description: `Se actualizaron los permisos del rol "${role.name}".`,
      });
    } catch (error: unknown) {
      let message = "No se pudieron actualizar los permisos del rol";
      if (error && typeof error === "object" && "message" in error) {
        message = String((error as { message?: string }).message) || message;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Aviso al cerrar pestaña/recargar si hay cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    if (isDirty) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }

    return undefined;
  }, [isDirty]);

  const handleBackClick = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        "Tienes cambios sin guardar en los permisos de este rol. ¿Seguro que quieres salir sin guardar?",
      );
      if (!confirmLeave) return;
    }
    navigate("/usuarios/roles-permisos");
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
            <p className="text-muted-foreground">
              Solo los administradores pueden acceder a la gestión de roles y permisos
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (Number.isNaN(roleId)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">ID de rol inválido.</p>
            <Button className="mt-4" variant="outline" onClick={handleBackClick}>
              Volver a roles
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = permsLoading || roleLoading || !role;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleBackClick}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Roles
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {role ? `Permisos del rol "${role.name}"` : "Permisos del rol"}
            </h2>
            <p className="text-muted-foreground">
              Activa o desactiva los permisos que aplica este rol en toda la plataforma.
            </p>
          </div>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={updating || !isDirty || !role || role.name.toLowerCase() === "admin"}
        >
          {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Guardar cambios
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permisos del rol</CardTitle>
          <CardDescription>
            El rol administrador está bloqueado y siempre tiene acceso total. Otros roles pueden
            personalizarse según las necesidades del negocio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando permisos del rol...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(permissionGroups).map(([moduleKey, perms]) => (
                <div
                  key={moduleKey}
                  className="space-y-2 border rounded-lg p-3 bg-muted/40"
                >
                  <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                    <CheckSquare className="w-3 h-3" />
                    {moduleKey}
                  </div>
                  <div className="space-y-1">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-start gap-2 text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3 w-3 rounded border-muted-foreground/40"
                          checked={
                            role?.name.toLowerCase() === "admin"
                              ? true
                              : !!role && roleHasPermission(perm.code)
                          }
                          disabled={
                            role?.name.toLowerCase() === "admin" ||
                            updating ||
                            !role
                          }
                          onChange={() => handleTogglePermission(perm.code)}
                        />
                        <span>
                          <span className="font-medium">{perm.name}</span>
                          {perm.description && (
                            <span className="block text-muted-foreground">
                              {perm.description}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RolePermissionsDetail;

