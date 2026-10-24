import { prisma } from "@/lib/prisma";
import { RentRequestStatus } from "../../../generated/prisma/enums";
const toCount = (value) => Number(value ?? 0);
const roundToOne = (value) => value === null || value === undefined ? null : Math.round(value * 10) / 10;
const toCountMap = (rows) => new Map(rows.map((row) => [row.id, row.count]));
/**
 * Admin-only directory of every account. Per-user activity columns are derived
 * once per request via group-by aggregation so the page stays cheap to render.
 */
export const getAdminUsersService = async ({ search = "", role = "", page = 1, limit = 10 }) => {
    const where = {};
    if (search) {
        where.OR = [
            { username: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
        ];
    }
    if (role)
        where.role = role;
    const now = new Date();
    const [users, totalCount, propertyRows, activeRentalRows, requestRows, reviewRows, walletRows] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                role: true,
                isEmailVerified: true,
                profilePicture: true,
                active: true,
                createdAt: true,
            },
        }),
        prisma.user.count({ where }),
        prisma.property.groupBy({ by: ["landlordId"], _count: { _all: true } }),
        prisma.rentRequest.groupBy({
            by: ["userId"],
            where: { status: RentRequestStatus.APPROVED, endDate: { gte: now } },
            _count: { _all: true },
        }),
        prisma.rentRequest.groupBy({ by: ["userId"], _count: { _all: true } }),
        prisma.review.groupBy({ by: ["userId"], _count: { _all: true } }),
        prisma.wallet.groupBy({ by: ["userId"], _sum: { balance: true } }),
    ]);
    const propertyMap = toCountMap(propertyRows.map((row) => ({ id: row.landlordId, count: row._count._all })));
    const activeRentalMap = toCountMap(activeRentalRows.map((row) => ({ id: row.userId, count: row._count._all })));
    const requestMap = toCountMap(requestRows.map((row) => ({ id: row.userId, count: row._count._all })));
    const reviewMap = toCountMap(reviewRows.map((row) => ({ id: row.userId, count: row._count._all })));
    const balanceMap = new Map(walletRows.map((row) => [row.userId, row._sum.balance]));
    const pages = Math.max(1, Math.ceil(totalCount / limit));
    return {
        users: users.map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            profilePicture: user.profilePicture,
            active: user.active,
            createdAt: user.createdAt,
            walletBalance: Number(balanceMap.get(user.id) ?? 0),
            propertyCount: toCount(propertyMap.get(user.id)),
            activeRentals: toCount(activeRentalMap.get(user.id)),
            rentRequestCount: toCount(requestMap.get(user.id)),
            reviewCount: toCount(reviewMap.get(user.id)),
        })),
        totalPages: pages,
        totalCount,
    };
};
/**
 * Admin-only directory of every listing. Each row carries the owning landlord
 * plus derived activity (open rent requests and review rating) so the admin
 * table can show more than the public listing does.
 */
export const getAdminPropertiesService = async ({ search = "", status = "", propertyType = "", page = 1, limit = 10 }) => {
    const where = {};
    if (status)
        where.status = status;
    if (propertyType)
        where.propertyType = propertyType;
    if (search) {
        where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { locationAddress: { contains: search, mode: "insensitive" } },
            { landlord: { username: { contains: search, mode: "insensitive" } } },
        ];
    }
    const [properties, totalCount, reviewRows, openRequestRows] = await Promise.all([
        prisma.property.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                landlord: { select: { id: true, username: true, email: true, profilePicture: true } },
            },
        }),
        prisma.property.count({ where }),
        prisma.review.groupBy({ by: ["propertyId"], _avg: { rating: true }, _count: { rating: true } }),
        prisma.rentRequest.groupBy({
            by: ["propertyId"],
            where: { status: RentRequestStatus.PENDING },
            _count: { _all: true },
        }),
    ]);
    const ratingMap = new Map(reviewRows.map((row) => [row.propertyId, { rating: roundToOne(row._avg.rating), count: row._count.rating }]));
    const openRequestMap = new Map(openRequestRows.map((row) => [row.propertyId, row._count._all]));
    return {
        properties: properties.map((property) => ({
            id: property.id,
            title: property.title,
            baseRentPrice: property.baseRentPrice,
            beds: property.beds,
            baths: property.baths,
            area: property.area,
            propertyType: property.propertyType,
            status: property.status,
            locationAddress: property.locationAddress,
            images: property.images,
            availableDate: property.availableDate,
            createdAt: property.createdAt,
            updatedAt: property.updatedAt,
            landlord: property.landlord,
            rating: ratingMap.get(property.id)?.rating ?? null,
            reviewCount: toCount(ratingMap.get(property.id)?.count),
            openRequests: toCount(openRequestMap.get(property.id)),
        })),
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        totalCount,
    };
};
