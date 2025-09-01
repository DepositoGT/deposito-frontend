import { apiFetch } from "./api";

export interface ApiCategory {
  id: number | string;
  name: string;
}

export const fetchCategories = async (): Promise<ApiCategory[]> => {
  const data = await apiFetch<ApiCategory[]>("/api/catalogs/product-categories", { method: "GET" });
  if (!Array.isArray(data)) return [];
  return data;
};
