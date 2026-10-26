import { WishlistApi } from "@/api/services/wishlist-service";
import { getApiErrorMessage } from "@/utils/api-error";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

export const useRemoveFromWishlist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: string) => WishlistApi.removeFromWishlist(propertyId),
    onSuccess: async () => {
      toast.success("Property was removed from wishlist");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "tenant"] }),
      ]);
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Could not remove this property"));
    },
  });
};
