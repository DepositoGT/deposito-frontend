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

export interface ApiProduct {
  id: string | number;
  name: string;
  price: number;
  stock: number;
  barcode?: string;
}

export const fetchProducts = async (): Promise<ApiProduct[]> => {
  const data = await apiFetch<ApiProduct[]>("/api/products", { method: "GET" });
  if (!Array.isArray(data)) return [];
  return data;
};