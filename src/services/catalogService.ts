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

export interface ApiCategory {
  id: number | string;
  name: string;
}

export const fetchCategories = async (): Promise<ApiCategory[]> => {
  const data = await apiFetch<ApiCategory[] | { items: ApiCategory[] }>("/api/catalogs/product-categories?page=1&pageSize=1000", { method: "GET" });
  // Handle paginated response
  if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
    return data.items;
  }
  // Handle direct array response (backward compatibility)
  if (Array.isArray(data)) return data;
  return [];
};
