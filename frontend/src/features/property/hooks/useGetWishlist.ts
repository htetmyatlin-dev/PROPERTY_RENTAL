import { WishlistApi } from "@/api/services/wishlist-service";
import { useAppStore } from "@/app/store";
import type { IWishlistResponse } from "@/features/property/types";
import type { ApiResponse } from "@/features/wallet/types";
import { useQuery } from "@tanstack/react-query";

interface UseGetWishlistOptions {
  /** Public pages render the heart button for guests too, so skip the request until signed in. */
  enabled?: boolean;
}

export const useGetWishlist = ({ enabled = true }: UseGetWishlistOptions = {}) => {
  const userId = useAppStore((state) => state.user?.id);

  return useQuery<ApiResponse<IWishlistResponse>>({
    // The response is per-user, so the id is part of the key to keep a
    // previous account's saved properties out of the next account's cache.
    queryKey: ["wishlist", userId ?? "guest"],
    queryFn: WishlistApi.getWishlist,
    enabled: enabled && !!userId,
  });
};
