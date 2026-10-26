import { useAppStore } from "@/app/store";
import { toast } from "react-toastify";
import { useGetWishlist } from "./useGetWishlist";
import { useAddToWishlist } from "./useAddToWishlist";
import { useRemoveFromWishlist } from "./useRemoveFromWishlist";

export const useHandleWishlist = () => {
  const user = useAppStore((state) => state.user);
  const { data: wishlistData } = useGetWishlist({ enabled: !!user?.id });
  const wishlist = wishlistData?.content?.wishlist;
  const isInWishlist = (propertyId: string) =>
    wishlist?.some((p) => p.propertyId === propertyId) ?? false;
  const { mutate: addToWishlist } = useAddToWishlist();
  const { mutate: removeFromWishlist } = useRemoveFromWishlist();
  const toggleSave = (propertyId: string) => {
    if (!user) {
      toast.info("Sign in to save properties to your wishlist.");
      return;
    }
    if (isInWishlist(propertyId)) removeFromWishlist(propertyId);
    else addToWishlist(propertyId);
  };

  return { isInWishlist, toggleSave };
};
