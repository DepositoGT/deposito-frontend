/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 * 
 * This source code is licensed under a Proprietary License.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without express written permission.
 * 
 * For licensing inquiries: GitHub @dpatzan2
 */

import { apiFetch } from "./api";

export interface ApiStatus {
  id: number | string;
  name: string;
}

export const fetchStatuses = async (): Promise<ApiStatus[]> => {
  const data = await apiFetch<ApiStatus[]>("/api/catalogs/statuses", { method: "GET" });
  if (!Array.isArray(data)) return [];
  return data;
};
