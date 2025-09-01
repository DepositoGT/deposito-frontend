import { apiFetch } from "./api";

export interface ApiPaymentTerm {
  id: number | string;
  name: string;
}

export const fetchPaymentTerms = async (): Promise<ApiPaymentTerm[]> => {
  const data = await apiFetch<ApiPaymentTerm[]>("/api/catalogs/payment-terms", { method: "GET" });
  if (!Array.isArray(data)) return [];
  return data;
};
