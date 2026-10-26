import { WishlistRepository } from "@/repositories/wishlist.repository";
import type { AuthRequest } from "@/types/types";
import { successResponse } from "@/utils/api.response";
import { AppError } from "@/utils/app.error";
import { asyncHandler } from "@/utils/async.handler";
import type { NextFunction, Response } from "express";

export const addToWishlist = asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const userId = req.user?.id;
    const { propertyId } = req.body;

    if (!userId) throw new AppError("Unauthorized", 401);
    if (!propertyId) throw new AppError("Property id is required", 400);

    const existing = await WishlistRepository.findByUserAndProperty(userId, propertyId);
    if (existing) throw new AppError("Property is already in your wishlist", 409);

    const wishlist = await WishlistRepository.create(userId, propertyId);
    successResponse(res, "Property added to wishlist", 201, { wishlist });
});

export const removeFromWishlist = asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const userId = req.user?.id;
    const { propertyId } = req.body;

    if (!userId) throw new AppError("Unauthorized", 401);
    if (!propertyId) throw new AppError("Property id is required", 400);

    const removed = await WishlistRepository.delete(userId, propertyId);
    if (removed.count === 0) throw new AppError("Property is not in your wishlist", 404);

    successResponse(res, "Property removed from wishlist", 200);
});

/**
 * `GET /wishlist` always resolves to the signed-in user. The legacy
 * `GET /wishlist/users/:userId` route still works, but only for that user (or
 * an admin) so one tenant cannot read another tenant's saved properties.
 */
export const getUserWishlist = asyncHandler(async (req: AuthRequest, res: Response, _next: NextFunction) => {
    const requestedUserId = req.params.userId;
    const userId = requestedUserId ?? req.user?.id;

    if (!userId) throw new AppError("Unauthorized", 401);
    if (requestedUserId && req.user?.id !== requestedUserId && req.user?.role !== "ADMIN") {
        throw new AppError("You are not authorized to view this wishlist", 403);
    }

    const wishlist = await WishlistRepository.findByUserId(userId);
    successResponse(res, "Wishlist was fetched", 200, { wishlist });
});
