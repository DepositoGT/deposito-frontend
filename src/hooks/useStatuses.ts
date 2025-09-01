import { useQuery } from "@tanstack/react-query";
import { fetchStatuses } from "@/services/statusService";

export const STATUSES_QUERY_KEY = ["statuses"] as const;

export const useStatuses = () => {
  return useQuery({
    queryKey: STATUSES_QUERY_KEY,
    queryFn: fetchStatuses,
    staleTime: 5 * 60 * 1000,
  });
};
