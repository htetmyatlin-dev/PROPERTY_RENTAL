import { PropertyRepository } from "@/repositories/property.repository";
import { ReviewRepository } from "@/repositories/review.repository";
import { UserRepository } from "@/repositories/user.repository";
import { successResponse } from "@/utils/api.response";
import { AppError } from "@/utils/app.error";
import { asyncHandler } from "@/utils/async.handler";
import { notifyAdmins, notifyUser } from "@/utils/notify";

export const createReview = asyncHandler(async (req, res, _next) => {
    const { propertyId } = req.params
    const userId = req.user?.id
    const { rating, comment } = req.body
    if (!userId || !propertyId) throw new AppError("UserId and propertyId required", 401);
    const review = await ReviewRepository.create({ userId, propertyId, rating, comment });

    const [property, reviewer] = await Promise.all([
        PropertyRepository.findById(propertyId),
        UserRepository.findById(userId),
    ]);
    const reviewerName = reviewer?.username ?? "A tenant";
    const propertyTitle = property?.title ?? "a property";
    const summary = `${reviewerName} left a ${rating}-star review on "${propertyTitle}".`;

    if (property?.landlordId) await notifyUser(property.landlordId, "New review", summary);
    await notifyAdmins("New review", summary);

    successResponse(res, "Review was created", 201, { review });
});

export const getReviewsByPropertyId = asyncHandler(async (req, res, _next) => {
    const { propertyId } = req.params
    if (!propertyId) throw new AppError("PropertyId required", 401);
    const reviews = await ReviewRepository.findByPropertyId(propertyId);
    successResponse(res, "Reviews were fetched", 200, { reviews });
});

export const getReviewsByUserId = asyncHandler(async (req, res, _next) => {
    const { userId } = req.params
    if (!userId) throw new AppError("UserId required", 401);
    const reviews = await ReviewRepository.findByUserId(userId);
    successResponse(res, "Reviews were fetched", 200, { reviews });
});

export const updateReview = asyncHandler(async (req, res, _next) => {
    const { id } = req.params
    const { rating, comment } = req.body
    const review = await ReviewRepository.edit(id, { rating, comment });
    successResponse(res, "Review was updated", 200, { review });
});

export const deleteReview = asyncHandler(async (req, res, _next) => {
    const { id } = req.params
    await ReviewRepository.delete(id);
    successResponse(res, "Review was deleted", 200);
})