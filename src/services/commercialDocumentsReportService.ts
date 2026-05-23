/**
 * Reporte stock comprometido y documentos abiertos.
 */

import { apiFetch } from "./api";

export type CommittedStockProduct = {
  product_id: string;
  name: string;
  barcode?: string | null;
  stock: number;
  reserved: number;
  available: number;
  reservations: Array<{
    reservation_id: string;
    qty: number;
    document_id: string;
    reference?: string | null;
    doc_type?: string;
    status?: string;
    customer?: string | null;
    valid_until?: string | null;
  }>;
};

export type CommittedStockReport = {
  summary: {
    totalReservedQty: number;
    productsWithReservations: number;
    openOrders: number;
    openQuotes: number;
  };
  products: CommittedStockProduct[];
  openOrders: Array<{
    id: string;
    reference?: string | null;
    status: string;
    customer?: string | null;
    total: number | string;
    valid_until?: string | null;
  }>;
  openQuotes: Array<{
    id: string;
    reference?: string | null;
    status: string;
    customer?: string | null;
    total: number | string;
    valid_until?: string | null;
  }>;
};

export async function fetchCommittedStockReport(): Promise<CommittedStockReport> {
  return apiFetch<CommittedStockReport>("/api/commercial-documents/committed-stock", {
    method: "GET",
  });
}
