import { useQuery } from "@tanstack/react-query";
import { getRoles } from "@/services/userService";

export const useRoles = () => {
  return useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    staleTime: 300000, // 5 minutos (los roles no cambian frecuentemente)
  });
};
