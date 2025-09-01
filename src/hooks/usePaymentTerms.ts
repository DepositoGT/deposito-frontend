import { useQuery } from "@tanstack/react-query";
import { fetchPaymentTerms } from "@/services/paymentService";

export const PAYMENT_TERMS_QUERY_KEY = ["paymentTerms"] as const;

export const usePaymentTerms = () => {
  return useQuery({
    queryKey: PAYMENT_TERMS_QUERY_KEY,
    queryFn: fetchPaymentTerms,
    staleTime: 5 * 60 * 1000,
  });
};
