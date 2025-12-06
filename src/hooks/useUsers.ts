import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/services/userService";

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    staleTime: 30000, // 30 segundos
  });
};
