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
 * Hook de ayuda para trabajar con permisos del usuario autenticado.
 *
 * Lee los permisos desde el contexto de autenticación (user.permissions)
 * y expone helpers para comprobar si el usuario puede realizar ciertas acciones.
 */

import { useMemo } from "react";
import { useAuth } from "@/context/useAuth";

export const useAuthPermissions = () => {
  const { user, isLoading } = useAuth();

  const { isAdmin, permissionsSet, permissionsReady } = useMemo(() => {
    const roleName = user?.role?.name ?? undefined;
    const isAdminRole =
      typeof roleName === "string" && roleName.toLowerCase() === "admin";

    const rawPerms = Array.isArray(user?.permissions)
      ? user!.permissions!
      : [];

    const set = new Set<string>(
      rawPerms.map((p) => String(p)).filter((p) => p.length > 0),
    );

    // Los permisos están "listos" cuando ya terminó de cargar el estado de auth.
    // Si isLoading es false, significa que ya se intentó cargar el usuario desde localStorage.
    // Si el usuario no existe, PrivateRoute lo manejará. Si existe pero no tiene permisos,
    // los tratamos como un array vacío (sin permisos).
    const ready = !isLoading;

    return {
      isAdmin: isAdminRole,
      permissionsSet: set,
      permissionsReady: ready,
    };
  }, [user, isLoading]);

  /**
   * Devuelve true si el usuario tiene AL MENOS UNO de los permisos indicados.
   * Los administradores siempre devuelven true.
   */
  const hasPermission = (...codes: string[]): boolean => {
    if (isAdmin) return true;
    if (!codes.length) return true;
    if (!permissionsSet.size) return false;
    return codes.some((code) => permissionsSet.has(String(code)));
  };

  /**
   * Devuelve true si el usuario tiene TODOS los permisos indicados.
   * Útil para acciones más sensibles.
   */
  const hasAllPermissions = (...codes: string[]): boolean => {
    if (isAdmin) return true;
    if (!codes.length) return true;
    if (!permissionsSet.size) return false;
    return codes.every((code) => permissionsSet.has(String(code)));
  };

  return {
    isAdmin,
    hasPermission,
    hasAllPermissions,
    permissions: Array.from(permissionsSet),
    // Exponer info extra para rutas y componentes
    isLoading,
    user,
    permissionsReady,
  };
};

