/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 *
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useQuery } from "@tanstack/react-query";
import { getPermissions, getRolesWithPermissions, getRoleWithPermissions } from "@/services/userService";

export const usePermissions = () => {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: getPermissions,
    staleTime: 5 * 60 * 1000,
  });
};

type RolesWithPermissionsParams = {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
};

export const useRolesWithPermissions = (params?: RolesWithPermissionsParams) => {
  const { enabled = true, page, pageSize } = params ?? {};

  return useQuery({
    queryKey: ["roles-with-permissions", { page, pageSize }],
    queryFn: () => getRolesWithPermissions({ page, pageSize }),
    staleTime: 60 * 1000,
    enabled,
  });
};

export const useRoleWithPermissions = (id?: number, enabled: boolean = true) => {
  const finalEnabled = enabled && typeof id === "number" && !Number.isNaN(id);

  return useQuery({
    queryKey: ["role-with-permissions", id],
    queryFn: () => getRoleWithPermissions(id as number),
    enabled: finalEnabled,
    staleTime: 60 * 1000,
  });
};


