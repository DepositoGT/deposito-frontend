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