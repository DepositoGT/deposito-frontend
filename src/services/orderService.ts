/**
 * Copyright (c) 2026 Diego Patzán. All Rights Reserved.
 *
 * API pedidos comerciales.
 */

import { apiFetch } from "./api";
import type { QuoteLine, QuoteLinePayload } from "./quoteService";

export type OrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

export type Order = {
  id: string;
  reference?: string | null;
  doc_type: "ORDER";
  status: OrderStatus;
  valid_until?: string | null;
  confirmed_at?: string | null;
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
  documentSales?: Array<{
    id: string;
    sale?: {
      id: string;
      reference?: string | null;
      total?: number | string;
      date?: string;
      status?: { name: string };
    };
  }>;
  convertedFrom?: {
    id: string;
    reference?: string | null;
    doc_type: string;
    status?: string;
  } | null;
  created_by?: string | null;
  createdBy?: { id: string; name: string; email?: string };
  created_at: string;
  updated_at: string;
  lines: QuoteLine[];
  stock_reservations?: Array<{
    id: string;
    product_id: string;
    qty: number;
    status: string;
    expires_at?: string | null;
    reservation_kind?: string;
  }>;
  _count?: { lines: number; stock_reservations?: number; documentSales?: number };
};

export type CreateOrderPayload = {
  customer?: string;
  customer_nit?: string;
  is_final_consumer?: boolean;
  customer_contact_id?: string;
  sales_channel?: string;
  notes?: string;
  valid_until?: string;
  items: QuoteLinePayload[];
};

export type OrdersListResponse = {
  items: Order[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  nextPage: number | null;
  prevPage: number | null;
};

export type ConvertOrderToSalePayload = {
  payment_method_id: number;
  amount_received?: number;
  change?: number;
  lines?: Array<{ line_id: string; qty: number }>;
  /** Caja seleccionada en el POS; valida el turno contra ella */
  cash_register_id?: string;
};

export function pendingOrderLineQty(line: QuoteLine): number {
  const total = Number(line.qty || 0);
  const fulfilled = Number(line.qty_fulfilled || 0);
  return Math.max(0, total - fulfilled);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Borrador",
  CONFIRMED: "Confirmado",
  PARTIALLY_FULFILLED: "Parcial",
  FULFILLED: "Completado",
  CANCELLED: "Cancelado",
  EXPIRED: "Vencido",
};

export function orderStatusLabel(status: OrderStatus | string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export function num(v: number | string | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchOrders(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}): Promise<OrdersListResponse> {
  const q = new URLSearchParams();
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  return apiFetch<OrdersListResponse>(`/api/orders${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function fetchOrderById(idOrRef: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${encodeURIComponent(idOrRef)}`, { method: "GET" });
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return apiFetch<Order>("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOrder(id: string, payload: CreateOrderPayload): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function confirmOrder(id: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${encodeURIComponent(id)}/confirm`, { method: "POST" });
}

export async function cancelOrder(id: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}

export async function convertOrderToSale(
  id: string,
  payload: ConvertOrderToSalePayload
): Promise<{ order: Order; sale: unknown }> {
  return apiFetch(`/api/orders/${encodeURIComponent(id)}/convert-to-sale`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
