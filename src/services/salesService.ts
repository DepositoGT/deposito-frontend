import { apiFetch } from "./api";

export interface SalesQueryParams {
  status?: string;
  period?: string;
  page?: number;
  pageSize?: number;
}

export const fetchSales = async (params: SalesQueryParams = {}) => {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.period) search.set("period", params.period);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));

  const url = `/api/sales${search.toString() ? `?${search.toString()}` : ""}`;
  const data = await apiFetch(url, { method: "GET" });
  return data;
};

export const updateSaleStatus = async (saleId: string, payload: { status_id?: number; status_name?: string }) => {
  if (!saleId) throw new Error('saleId requerido');
  if (!payload.status_id && !payload.status_name) throw new Error('Debe enviar status_id o status_name');
  return apiFetch(`/api/sales/${saleId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
};
