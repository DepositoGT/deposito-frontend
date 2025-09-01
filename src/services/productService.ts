import { apiFetch } from "./api";
import type { Product, StockStatus } from "@/types";
import type { ApiProduct as ApiProductType, CreateProductPayload as CreateProductPayloadType, UpdateProductPayload as UpdateProductPayloadType } from "@/types/product";

// API product shape (flexible; fields optional to adapt to various backends)
export type ApiProduct = ApiProductType;

const normalizeStatusName = (name: string): StockStatus | string => {
  const n = name.trim().toLowerCase();
  if (["disponible", "activo", "available", "active"].includes(n)) return "active";
  if (["bajo", "stock bajo", "low", "low_stock"].includes(n)) return "low_stock";
  if (["critico", "crítico", "critical"].includes(n)) return "critical";
  if (["agotado", "sin stock", "no disponible", "out_of_stock", "out of stock"].includes(n)) return "out_of_stock";
  return name; // fallback to original string
};

const mapStatus = (status?: string | number): StockStatus | string => {
  if (typeof status === "string") return normalizeStatusName(status);
  if (typeof status === "number") {
    switch (status) {
      case 1:
        return "active";
      case 2:
        return "low_stock";
      case 3:
        return "out_of_stock";
      default:
        return "active";
    }
  }
  return "active";
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

export const adaptApiProduct = (p: ApiProduct): Product => {
  const category =
    (typeof p.category === "object" && p.category?.name)
      ? p.category.name
      : (typeof p.category === "string" ? p.category : undefined) ||
        p.category_name ||
        (p.category_id != null ? String(p.category_id) : "");

  const supplier =
    (typeof p.supplier === "object" && p.supplier?.name)
      ? p.supplier.name
      : (typeof p.supplier === "string" ? p.supplier : undefined) ||
        p.supplier_name ||
        (p.supplier_id != null ? String(p.supplier_id) : "");

  const statusRaw: string | number | undefined =
    (typeof p.status === "object" && (p.status as { id?: string | number; name?: string }).name)
      ? (p.status as { id?: string | number; name?: string }).name!
      : (typeof p.status === "string" ? p.status : undefined) ??
        (typeof p.status_id !== "undefined" ? Number(p.status_id) : undefined);

  const status = mapStatus(statusRaw);

  return {
    id: String(p.id),
    name: p.name,
    category: category || "Sin categoría",
    brand: p.brand || "",
    size: p.size || "",
    stock: toNumber(p.stock, 0),
    minStock: toNumber(p.min_stock, 0),
    price: toNumber(p.price, 0),
    cost: toNumber(p.cost, 0),
    supplier: supplier || "",
    barcode: p.barcode || "",
    description: (p.description ?? "") as string,
    status,
  };
};

export const fetchProducts = async (): Promise<Product[]> => {
  const data = await apiFetch<ApiProduct[]>("/api/products", { method: "GET" });
  if (!Array.isArray(data)) return [];
  return data.map(adaptApiProduct);
};

export const fetchCriticalProducts = async (): Promise<Product[]> => {
  const data = await apiFetch<ApiProduct[]>("/api/products/critical", { method: "GET" });
  if (!Array.isArray(data)) return [];
  return data.map(adaptApiProduct);
};

export type CreateProductPayload = CreateProductPayloadType;

export const createProduct = async (payload: CreateProductPayload): Promise<ApiProduct> => {
  const data = await apiFetch<ApiProduct>("/api/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
};

export const deleteProduct = async (id: string): Promise<{ ok?: boolean }> => {
  const data = await apiFetch<{ ok?: boolean }>(`/api/products/${id}`, {
    method: "DELETE",
  });
  return data;
};

// Download products PDF report (returns void; triggers browser download)
export const exportProductsPdf = async (): Promise<void> => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
  const token = localStorage.getItem("auth:token");

  const res = await fetch(`${API_BASE}/api/products/report.pdf`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = text;
    }

    const extractMessage = (v: unknown): string | undefined => {
      if (!v || typeof v !== 'object') return undefined;
      const maybe = v as { message?: unknown };
      if (typeof maybe.message === 'string') return maybe.message;
      if (typeof maybe.message === 'object' && maybe.message !== null) {
        try { return JSON.stringify(maybe.message); } catch { return undefined; }
      }
      return undefined;
    };

    const msg = extractMessage(data) ?? res.statusText ?? 'Error descargando PDF';
    throw new Error(msg);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'productos_reporte.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export type UpdateProductPayload = UpdateProductPayloadType;

export const updateProduct = async (id: string, payload: UpdateProductPayload): Promise<ApiProduct> => {
  const data = await apiFetch<ApiProduct>(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
};

export interface StockAdjustPayload {
  type: "add" | "remove";
  amount: number;
  reason: string;
  supplier_id?: string;
  cost?: number;
}

export const adjustProductStock = async (
  id: string,
  payload: StockAdjustPayload
): Promise<{ updated?: boolean } | Record<string, unknown> | undefined> => {
  const data = await apiFetch<Record<string, unknown> | { updated?: boolean } | undefined>(`/api/products/${id}/stock-adjust`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
};
