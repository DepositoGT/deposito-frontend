import { apiFetch } from "./api";
import type { Supplier, Status } from "@/types";
import { adaptApiProduct, type ApiProduct } from "./productService";

export interface ApiSupplier {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  category_id?: number | string | null;
  products?: number | string | null;
  last_order?: string | null;
  total_purchases?: number | string | null;
  rating?: number | string | null;
  status_id?: number | string | null;
  payment_terms_id?: number | string | null;
  category?: { id: number | string; name: string } | null;
  status?: { id: number | string; name: string } | null;
  payment_term?: { id: number | string; name: string } | null;
  productsList?: ApiProduct[] | null;
  [key: string]: unknown;
}

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

const normalizeStatusName = (name: string): Status | string => {
  const n = name.trim().toLowerCase();
  if (["activo", "active"].includes(n)) return "active";
  if (["inactivo", "inactive"].includes(n)) return "inactive";
  if (["pendiente", "pending"].includes(n)) return "pending";
  if (["completado", "completed"].includes(n)) return "completed";
  if (["resuelto", "resolved"].includes(n)) return "resolved";
  return name;
};

const mapStatus = (status?: string | number | null): Status | string => {
  if (typeof status === "string") return normalizeStatusName(status);
  if (typeof status === "number") {
    switch (status) {
      case 1:
        return "active";
      case 2:
        return "inactive";
      default:
        return "active";
    }
  }
  return "active";
};

// Format date/time removing timezone info (DB stores Guatemala time as-is)
const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "N/A";
  // Remove timezone info if present - DB stores Guatemala time as-is
  const cleanDate = dateStr.replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '');
  const d = new Date(cleanDate);
  if (isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
};

export const adaptApiSupplier = (s: ApiSupplier): Supplier => {
  const categoryName = s.category?.name ?? (s.category_id != null ? String(s.category_id) : "");
  const statusRaw: string | number | undefined = s.status?.name ?? (s.status_id != null ? Number(s.status_id) : undefined);
  const paymentTerms = s.payment_term?.name ?? "";

  const productsList = Array.isArray(s.productsList)
    ? s.productsList.map(adaptApiProduct)
    : undefined;

  return {
    id: String(s.id),
    name: s.name,
    contact: s.contact ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    address: s.address ?? "",
    category: categoryName || "",
    products: toNumber(s.products, 0),
    // Format last_order date properly
    lastOrder: formatDateTime(s.last_order),
    totalPurchases: toNumber(s.total_purchases, 0),
    rating: toNumber(s.rating, 0),
    status: mapStatus(statusRaw),
    paymentTerms: paymentTerms,
    productsList,
  };
};

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const data = await apiFetch<ApiSupplier[]>("/api/suppliers", { method: "GET" });
  if (!Array.isArray(data)) return [];
  return data.map(adaptApiSupplier);
};

export interface CreateSupplierPayload {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  category_id?: number | string;
  status_id?: number | string;
  payment_terms_id?: number | string;
  rating?: number;
}

export const createSupplier = async (payload: CreateSupplierPayload): Promise<ApiSupplier> => {
  const data = await apiFetch<ApiSupplier>("/api/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
};

export const fetchSupplierById = async (id: string): Promise<ApiSupplier | null> => {
  const data = await apiFetch<ApiSupplier>(`/api/suppliers/${id}`, { method: "GET" });
  return data ?? null;
};

export const updateSupplier = async (id: string, payload: Partial<CreateSupplierPayload>): Promise<ApiSupplier> => {
  const data = await apiFetch<ApiSupplier>(`/api/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
};
 
export const deleteSupplier = async (id: string): Promise<{ ok?: boolean } | null> => {
  const data = await apiFetch<{ ok?: boolean }>(`/api/suppliers/${id}`, { method: "DELETE" });
  return data ?? null;
};
 
