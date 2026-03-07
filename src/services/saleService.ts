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

export interface SaleItemPayload {
  product_id: string;
  price: number;
  qty: number;
}

export interface CreateSalePayload {
  customer: string;
  customer_nit: string;
  is_final_consumer: boolean;
  payment_method_id: number;
  status_id: number;
  items: SaleItemPayload[];
}

export interface SaleItem {
  id: number;
  product_id: string;
  product: {
    id: string;
    name: string;
    barcode?: string;
  };
  price: number;
  qty: number;
}

/** Documento tributario electrónico (certificación SAT/InFile) vinculado a la venta */
export interface SaleDte {
  id: string;
  sale_id: string;
  document_type?: string;
  authorization?: string;
  series?: string;
  number?: string;
  emission_date?: string;
  status?: string;
  provider?: string;
  xml_url?: string;
  pdf_url?: string;
}

export interface ReturnDetail {
  id: string;
  return_date: string;
  reason?: string;
  total_refund: number;
  status: {
    id: number;
    name: string;
  };
  return_items: Array<{
    id: number;
    product: {
      id: string;
      name: string;
      barcode?: string;
    };
    qty_returned: number;
    refund_amount: number;
  }>;
}

export interface Sale {
  id: string;
  /** Referencia legible (ej. V-000001). Generada en backend al crear la venta. */
  reference?: string;
  date: string;
  customer?: string;
  customer_nit?: string;
  is_final_consumer: boolean;
  subtotal?: number;
  discount_total?: number;
  total: number;
  total_returned?: number;
  adjusted_total?: number;
  items: number;
  amount_received?: number;
  change?: number;
  created_by?: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  status: {
    id: number;
    name: string;
  };
  payment_method: {
    id: number;
    name: string;
  };
  sale_items: SaleItem[];
  sale_dtes?: SaleDte[];
  returns?: ReturnDetail[];
}

/** Respuesta mínima del backend al crear una venta (incluye al menos id) */
export interface CreateSaleResponse {
  id: string;
  [key: string]: unknown;
}

export const createSale = async (payload: CreateSalePayload): Promise<CreateSaleResponse> => {
  return await apiFetch("/api/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const fetchSaleById = async (saleId: string): Promise<Sale> => {
  return await apiFetch(`/api/sales/${saleId}`, {
    method: "GET",
  });
};