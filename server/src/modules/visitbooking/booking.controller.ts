import { PropertyRepository } from "@/repositories/property.repository";
import { UserRepository } from "@/repositories/user.repository";
import { VisitBookingRepository } from "@/repositories/visitbooking.repository";
import { successResponse } from "@/utils/api.response";
import { AppError } from "@/utils/app.error";
import { asyncHandler } from "@/utils/async.handler";
import { notifyAdmins, notifyUser } from "@/utils/notify";

const propertyTitleFor = async (propertyId: string) => {
    const property = await PropertyRepository.findById(propertyId);
    return property?.title ?? "the property";
};

export const createBooking = asyncHandler(async (req, res, _next) => {
    const { landlordId, tenantId, propertyId, phoneNumber, schedules } = req.body;
    const booking = await VisitBookingRepository.create(landlordId, tenantId, propertyId, phoneNumber, schedules);

    const [tenant, title] = await Promise.all([
        UserRepository.findById(tenantId),
        propertyTitleFor(propertyId),
    ]);
    const tenantName = tenant?.username ?? "A tenant";

    await notifyUser(
        landlordId,
        "New tour booking",
        `${tenantName} requested a tour of "${title}".`,
    );
    await notifyAdmins(
        "New tour booking",
        `${tenantName} requested a tour of "${title}".`,
    );

    successResponse(res, "Booking created successfully", 201, { booking })
})

export const getBookingsByTenantId = asyncHandler(async (req, res, _next) => {
    const tenantId = req.user?.id;
    if (!tenantId) throw new AppError("Unauthorized", 401);
    const bookings = await VisitBookingRepository.findByTenantId(tenantId);
    successResponse(res, "Bookings retrieved successfully", 200, { bookings })
})

export const getBookingsByLandlordId = asyncHandler(async (req, res, _next) => {
    const landlordId = req.user?.id;
    if (!landlordId) throw new AppError("Unauthorized", 401);
    const bookings = await VisitBookingRepository.findByLandlordId(landlordId);
    successResponse(res, "Bookings retrieved successfully", 200, { bookings })
})

export const updateBooking = asyncHandler(async (req, res, _next) => {
    const { bookingId } = req.params;
    const tenantId = req.user?.id;
    const booking = await VisitBookingRepository.findById(bookingId);
    if (!booking) throw new AppError("Booking not found", 404);
    if (!tenantId || booking.tenantId !== tenantId) throw new AppError("You are not authorized to update this booking", 403);
    if (booking.status !== "PENDING") throw new AppError("Only pending bookings can be updated", 400);

    const { phoneNumber, schedules } = req.body;
    const updated = await VisitBookingRepository.updateBooking(bookingId, { phoneNumber, schedules });
    successResponse(res, "Booking updated successfully", 200, { booking: updated })
})

export const deleteBooking = asyncHandler(async (req, res, _next) => {
    const { bookingId } = req.params;
    const tenantId = req.user?.id;
    const booking = await VisitBookingRepository.findById(bookingId);
    if (!booking) throw new AppError("Booking not found", 404);
    if (!tenantId || booking.tenantId !== tenantId) throw new AppError("You are not authorized to delete this booking", 403);
    if (booking.status !== "PENDING") throw new AppError("Only pending bookings can be deleted", 400);

    await VisitBookingRepository.deleteBooking(bookingId);
    successResponse(res, "Booking deleted successfully", 200, {})
})

export const acceptBooking = asyncHandler(async (req, res, _next) => {
    const { bookingId } = req.params;
    const { remarks } = req.body;
    const existing = await VisitBookingRepository.findById(bookingId);
    if (!existing) throw new AppError("Booking not found", 404);

    const booking = await VisitBookingRepository.acceptBooking(bookingId, remarks);
    const title = await propertyTitleFor(existing.propertyId);

    await notifyUser(
        existing.tenantId,
        "Tour booking accepted",
        `Your tour request for "${title}" was accepted.${remarks ? ` Note: ${remarks}` : ""}`,
    );

    successResponse(res, "Booking accepted successfully", 200, { booking })
})

export const rejectBooking = asyncHandler(async (req, res, _next) => {
    const { bookingId } = req.params;
    const { remarks } = req.body;
    const existing = await VisitBookingRepository.findById(bookingId);
    if (!existing) throw new AppError("Booking not found", 404);

    const booking = await VisitBookingRepository.rejectBooking(bookingId, remarks);
    const title = await propertyTitleFor(existing.propertyId);

    await notifyUser(
        existing.tenantId,
        "Tour booking rejected",
        `Your tour request for "${title}" was rejected.${remarks ? ` Reason: ${remarks}` : ""}`,
    );

    successResponse(res, "Booking rejected successfully", 200, { booking })
})

export const updateBookingRemarks = asyncHandler(async (req, res, _next) => {
    const { bookingId } = req.params;
    const { remarks } = req.body;
    const existing = await VisitBookingRepository.findById(bookingId);
    if (!existing) throw new AppError("Booking not found", 404);

    const booking = await VisitBookingRepository.updateRemarks(bookingId, remarks);
    const title = await propertyTitleFor(existing.propertyId);

    await notifyUser(
        existing.tenantId,
        "Tour booking updated",
        `The landlord added a note to your tour request for "${title}": ${remarks}`,
    );

    successResponse(res, "Booking remarks updated successfully", 200, { booking })
})