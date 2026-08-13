/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 *
 * For licensing inquiries: GitHub @dpatzan2
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TenantContext } from "./TenantContext";
import { useAuth } from "./useAuth";
import {
  getActiveBranchId,
  getActiveCompanyId,
  setActiveTenant,
} from "@/services/api";

/** Sucursal especial: consolidado de toda la empresa (solo lectura). */
export const CONSOLIDATED = "all";

export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [companyId, setCompanyIdState] = useState<string | null>(getActiveCompanyId());
  const [branchId, setBranchIdState] = useState<string | null>(getActiveBranchId());

  const companies = useMemo(() => user?.companies ?? [], [user]);
  const allBranches = useMemo(() => user?.branches ?? [], [user]);

  // Empresa/sucursal que corresponden al usuario cargado. Se recalcula cuando lo
  // guardado ya no aplica (le quitaron el acceso, primer ingreso, o acaba de
  // crear una empresa y todavía no tenía sucursal ahí).
  const resolved = useMemo(() => {
    if (!user) return null;
    const validCompany = companies.find((c) => c.id === companyId);
    const nextCompany =
      validCompany ??
      companies.find((c) => allBranches.some((b) => b.company_id === c.id)) ??
      companies[0];
    if (!nextCompany) return null;

    const branchesOfCompany = allBranches.filter((b) => b.company_id === nextCompany.id);
    const validBranch =
      branchId === CONSOLIDATED
        ? { id: CONSOLIDATED }
        : branchesOfCompany.find((b) => b.id === branchId);
    const nextBranch =
      validBranch ??
      branchesOfCompany.find((b) => b.id === user.default_branch_id) ??
      branchesOfCompany.find((b) => b.is_default) ??
      branchesOfCompany[0];

    return { companyId: nextCompany.id, branchId: nextBranch?.id ?? null };
  }, [user, companies, allBranches, companyId, branchId]);

  const tenantPending = Boolean(
    resolved && (resolved.companyId !== companyId || resolved.branchId !== branchId)
  );

  useEffect(() => {
    if (!tenantPending || !resolved) return;
    setCompanyIdState(resolved.companyId);
    setBranchIdState(resolved.branchId);
    setActiveTenant(resolved.companyId, resolved.branchId);
  }, [tenantPending, resolved]);

  const branches = useMemo(
    () => allBranches.filter((b) => b.company_id === companyId),
    [allBranches, companyId]
  );

  // ponytail: recargar la página es la única forma barata de garantizar que
  // TODO se refresque; la mitad de los módulos carga con useEffect y no pasa
  // por la caché de react-query. Cambiar de sucursal es poco frecuente.
  const reloadForTenant = useCallback(
    (nextCompanyId: string | null, nextBranchId: string | null) => {
      setActiveTenant(nextCompanyId, nextBranchId);
      queryClient.clear();
      window.location.reload();
    },
    [queryClient]
  );

  const setCompany = useCallback(
    (nextCompanyId: string) => {
      if (nextCompanyId === companyId) return;
      const branchesOfCompany = allBranches.filter((b) => b.company_id === nextCompanyId);
      const nextBranch =
        branchesOfCompany.find((b) => b.is_default) ?? branchesOfCompany[0] ?? null;
      setCompanyIdState(nextCompanyId);
      setBranchIdState(nextBranch?.id ?? null);
      reloadForTenant(nextCompanyId, nextBranch?.id ?? null);
    },
    [allBranches, companyId, reloadForTenant]
  );

  const setBranch = useCallback(
    (nextBranchId: string) => {
      if (nextBranchId === branchId) return;
      setBranchIdState(nextBranchId);
      reloadForTenant(companyId, nextBranchId);
    },
    [companyId, branchId, reloadForTenant]
  );

  const value = useMemo(
    () => ({
      companies,
      branches,
      company: companies.find((c) => c.id === companyId) ?? null,
      branch: branchId === CONSOLIDATED ? null : branches.find((b) => b.id === branchId) ?? null,
      isConsolidated: branchId === CONSOLIDATED,
      setCompany,
      setBranch,
    }),
    [companies, branches, companyId, branchId, setCompany, setBranch]
  );

  // Los efectos de los hijos corren ANTES que los del padre: si se montan con el
  // tenant a medias, su primer fetch sale sin sucursal (o con la de otra empresa)
  // y el backend lo resuelve con la sucursal por defecto — datos de otra empresa.
  return (
    <TenantContext.Provider value={value}>{tenantPending ? null : children}</TenantContext.Provider>
  );
};

export default TenantProvider;
