/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 *
 * For licensing inquiries: GitHub @dpatzan2
 */

import type { Permission } from "@/services/userService";

/**
 * Agrupa permisos por módulo para la UI de roles.
 * Los códigos contacts.suppliers.* y contacts.clients.* se muestran en bloques separados.
 */
export function groupPermissionsByModule(permissions: Permission[]): Record<string, Permission[]> {
  const groups: Record<string, Permission[]> = {};
  for (const perm of permissions) {
    let key: string;
    if (perm.code.startsWith("contacts.suppliers.")) {
      key = "contactos — proveedores";
    } else if (perm.code.startsWith("contacts.clients.")) {
      key = "contactos — clientes";
    } else {
      const [module] = perm.code.split(".");
      key = module;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(perm);
  }
  return groups;
}
