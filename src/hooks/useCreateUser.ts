import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser, type CreateUserPayload } from "@/services/userService";

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
