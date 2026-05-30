/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * API cotizaciones comerciales.
 */

import { apiFetch } from "./api";

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "EXPIRED";

export type QuoteLine = {
  id: string;
  product_id: string;
  qty: number;
  qty_fulfilled?: number;
  unit_price: number | string;
  line_total: number | string;
  sort_order: number;
  product?: {
    id: string;
    name: string;
    barcode?: string | null;
  };
};

export type Quote = {
  id: string;
  reference?: string | null;
  doc_type: "QUOTE";
  status: QuoteStatus;
  valid_until?: string | null;
  customer?: string | null;
  customer_nit?: string | null;
  is_final_consumer: boolean;
  customer_contact_id?: string | null;
  customerContact?: {
    id: string;
    name: string;
    tax_id?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  sales_channel: string;
  subtotal?: number | string | null;
  discount_total?: number | string | null;
  total: number | string;
  notes?: string | null;
  public_token?: string | null;
  created_by?: string | null;
  createdBy?: { id: string; name: string; email?: string };
  created_at: string;
  updated_at: string;
  lines: QuoteLine[];
  convertedChildren?: Array<{
    id: string;
    reference?: string | null;
    doc_type: string;
    status: string;
    created_at: string;
  }>;
  _count?: { lines: number };
  stock_reservations?: Array<{
    id: string;
    qty: number;
    expires_at?: string | null;
    reservation_kind?: string;
  }>;
};

export type QuoteLinePayload = {
  product_id: string;
  qty: number;
  unit_price?: number;
};

export type CreateQuotePayload = {
  customer?: string;
  customer_nit?: string;
  is_final_consumer?: boolean;
  customer_contact_id?: string;
  sales_channel?: string;
  price_tier?: "LIST" | "WHOLESALE" | "PROMOTION";
  notes?: string;
  valid_until?: string;
  items: QuoteLinePayload[];
};

export type QuotesListResponse = {
  items: Quote[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  nextPage: number | null;
  prevPage: number | null;
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
};

export function quoteStatusLabel(status: QuoteStatus | string): string {
  return QUOTE_STATUS_LABELS[status as QuoteStatus] ?? status;
}

export async function fetchQuotes(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}): Promise<QuotesListResponse> {
  const q = new URLSearchParams();
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  return apiFetch<QuotesListResponse>(`/api/quotes${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function fetchQuoteById(idOrRef: string): Promise<Quote> {
  return apiFetch<Quote>(`/api/quotes/${encodeURIComponent(idOrRef)}`, { method: "GET" });
}

export async function createQuote(payload: CreateQuotePayload): Promise<Quote> {
  return apiFetch<Quote>("/api/quotes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateQuote(id: string, payload: CreateQuotePayload): Promise<Quote> {
  return apiFetch<Quote>(`/api/quotes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<Quote> {
  return apiFetch<Quote>(`/api/quotes/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export type ConvertToOrderResponse = {
  id: string;
  reference?: string | null;
  doc_type: "ORDER";
  status: string;
  lines: QuoteLine[];
  customer?: string | null;
  total: number | string;
};

export async function convertQuoteToOrder(id: string): Promise<ConvertToOrderResponse> {
  return apiFetch<ConvertToOrderResponse>(`/api/quotes/${encodeURIComponent(id)}/convert-to-order`, {
    method: "POST",
  });
}

export type PublicQuote = {
  reference?: string | null;
  status: QuoteStatus;
  customer?: string | null;
  customer_nit?: string | null;
  is_final_consumer: boolean;
  valid_until?: string | null;
  subtotal?: number | string | null;
  total: number | string;
  notes?: string | null;
  company_name: string;
  company_logo_url?: string;
  lines: Array<{
    product_name?: string | null;
    barcode?: string | null;
    qty: number;
    unit_price: number | string;
    line_total: number | string;
  }>;
};

export async function fetchPublicQuote(token: string): Promise<PublicQuote> {
  const base = import.meta.env.VITE_API_URL ?? "";
  const path = `/quotes/public/${encodeURIComponent(token)}`;
  const url = base.endsWith("/") ? `${base.slice(0, -1)}${path}` : `${base}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    let msg = "Cotización no disponible";
    try {
      const j = JSON.parse(text) as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<PublicQuote>;
}

export async function fetchQuoteShareLink(id: string): Promise<{ public_token: string; public_url: string }> {
  return apiFetch(`/api/quotes/${encodeURIComponent(id)}/share-link`, { method: "GET" });
}

export function buildQuoteMailto(publicUrl: string, reference?: string | null, customerEmail?: string | null) {
  const subject = encodeURIComponent(`Cotización ${reference ?? ""}`.trim());
  const body = encodeURIComponent(`Hola,\n\nPuede ver nuestra cotización en:\n${publicUrl}\n\nSaludos.`);
  const to = customerEmail?.trim() ? encodeURIComponent(customerEmail.trim()) : "";
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function num(v: number | string | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
