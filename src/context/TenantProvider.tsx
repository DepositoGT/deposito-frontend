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

  // Al cargar el usuario, elegir empresa/sucursal si lo guardado ya no aplica
  // (p.ej. le quitaron el acceso o es el primer ingreso).
  useEffect(() => {
    if (!user) return;
    const validCompany = companies.find((c) => c.id === companyId);
    const nextCompany =
      validCompany ??
      companies.find((c) => allBranches.some((b) => b.company_id === c.id)) ??
      companies[0];
    if (!nextCompany) return;

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

    const nextCompanyId = nextCompany.id;
    const nextBranchId = nextBranch?.id ?? null;
    if (nextCompanyId !== companyId || nextBranchId !== branchId) {
      setCompanyIdState(nextCompanyId);
      setBranchIdState(nextBranchId);
      setActiveTenant(nextCompanyId, nextBranchId);
    }
  }, [user, companies, allBranches, companyId, branchId]);

  const branches = useMemo(
    () => allBranches.filter((b) => b.company_id === companyId),
    [allBranches, companyId]
  );

  const setCompany = useCallback(
    (nextCompanyId: string) => {
      const branchesOfCompany = allBranches.filter((b) => b.company_id === nextCompanyId);
      const nextBranch =
        branchesOfCompany.find((b) => b.is_default) ?? branchesOfCompany[0] ?? null;
      setCompanyIdState(nextCompanyId);
      setBranchIdState(nextBranch?.id ?? null);
      setActiveTenant(nextCompanyId, nextBranch?.id ?? null);
      // Todo lo cacheado pertenece a la empresa anterior
      void queryClient.invalidateQueries();
    },
    [allBranches, queryClient]
  );

  const setBranch = useCallback(
    (nextBranchId: string) => {
      setBranchIdState(nextBranchId);
      setActiveTenant(companyId, nextBranchId);
      void queryClient.invalidateQueries();
    },
    [companyId, queryClient]
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

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export default TenantProvider;
