import { prisma } from "@/lib/prisma";
import { getIO } from "@/lib/socket";
import { NotificationRepository } from "@/repositories/notification.repository";

/**
 * Creates a notification for one user and pushes it to their personal socket
 * room. Notification failures must never break the business action that
 * triggered them, so they are logged and swallowed.
 */
export const notifyUser = async (userId: string, title: string, content: string) => {
    try {
        const notification = await NotificationRepository.createNotification(userId, title, content);
        getIO()?.to(userId).emit("notification_created", notification);
        return notification;
    } catch (error) {
        console.error("Failed to create notification", error);
        return null;
    }
};

/** Same as `notifyUser`, fanned out to every distinct recipient. */
export const notifyUsers = async (userIds: string[], title: string, content: string) => {
    const recipients = [...new Set(userIds.filter(Boolean))];
    return Promise.all(recipients.map((userId) => notifyUser(userId, title, content)));
};

/**
 * Pushes a notification to every active admin. Admin accounts have no
 * domain-specific inbox, so activity a moderator must act on (deposit and
 * withdrawal queues, new listings, disputes) is mirrored here.
 */
export const notifyAdmins = async (title: string, content: string) => {
    try {
        const admins = await prisma.user.findMany({
            where: { role: "ADMIN", active: true },
            select: { id: true },
        });
        return notifyUsers(admins.map((admin) => admin.id), title, content);
    } catch (error) {
        console.error("Failed to notify admins", error);
        return [];
    }
};

/** Consistent wallet money formatting for notification copy. */
export const formatNotificationAmount = (amount: number) =>
    `MMK ${new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
    }).format(amount)}`;
