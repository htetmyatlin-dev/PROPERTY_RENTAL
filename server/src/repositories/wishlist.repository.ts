import { prisma } from "@/lib/prisma";

const wishlistPropertySelect = {
    id: true,
    landlordId: true,
    title: true,
    description: true,
    baseRentPrice: true,
    beds: true,
    baths: true,
    area: true,
    propertyType: true,
    status: true,
    locationAddress: true,
    coordinates: true,
    images: true,
    nearTransitType: true,
    nearTransitDist: true,
    parkingSpaces: true,
    yearBuilt: true,
    petAllowed: true,
    appliances: true,
    availableDate: true,
    internetName: true,
    internetSpeed: true,
    leaseTermMonths: true,
    createdAt: true,
    updatedAt: true,
    landlord: {
        select: { id: true, username: true, profilePicture: true },
    },
} as const;

export class WishlistRepository {
    static async create(userId: string, propertyId: string) {
        return prisma.wishlist.create({ data: { userId, propertyId } });
    }

    static async delete(userId: string, propertyId: string) {
        return prisma.wishlist.deleteMany({ where: { userId, propertyId } });
    }

    static async findByUserAndProperty(userId: string, propertyId: string) {
        return prisma.wishlist.findUnique({
            where: { userId_propertyId: { userId, propertyId } },
        });
    }

    /** Wishlist entries with the full listing a tenant needs to render a card. */
    static async findByUserId(userId: string) {
        return prisma.wishlist.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: {
                property: { select: wishlistPropertySelect },
            },
        });
    }
}
