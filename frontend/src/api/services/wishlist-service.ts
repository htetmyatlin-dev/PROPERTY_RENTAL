import { axiosInstance } from "../axios-instance"

export const WishlistApi = {
    getWishlist: async () => {
        return (await axiosInstance.get(`/wishlist`)).data
    },

    addToWishlist: async (propertyId: string) => {
        return (await axiosInstance.post(`/wishlist`, { propertyId })).data
    },

    removeFromWishlist: async (propertyId: string) => {
        return (await axiosInstance.delete("/wishlist", { data: { propertyId } })).data
    }
}
