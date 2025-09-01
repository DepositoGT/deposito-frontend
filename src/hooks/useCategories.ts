import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/services/catalogService";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

export const useCategories = () => {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
