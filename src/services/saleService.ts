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

export const createSale = async (payload: CreateSalePayload) => {
  return await apiFetch("/api/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};