import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl } from "@/services/api";

export interface PaymentMethod {
  id: number;
  name: string;
}

const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const res = await fetch(`${getApiBaseUrl()}/catalogs/payment-methods`);
  console.log(res)
  if (!res.ok) throw new Error("Failed to fetch payment methods");
  return res.json();
};

export const usePaymentMethods = () => {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: fetchPaymentMethods,
    staleTime: 60 * 1000,
  });
};
