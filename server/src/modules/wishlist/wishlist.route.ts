import { protect } from "@/middleware/auth.middleware";
import { Router } from "express";
import { addToWishlist, getUserWishlist, removeFromWishlist } from "./wishlist.controller";

const router = Router()

router.route("/")
    .get(protect, getUserWishlist)
    .post(protect, addToWishlist)
    .delete(protect, removeFromWishlist)

// Kept for backwards compatibility with older clients.
router.get("/users/:userId", protect, getUserWishlist)

export { router as wishlistRouter }
