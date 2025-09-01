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
