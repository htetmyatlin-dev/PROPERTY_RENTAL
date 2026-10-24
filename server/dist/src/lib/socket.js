import { ChatPresence } from "@/modules/chat/chat.presence";
import { registerChatSocketHandler } from "@/modules/chat/chat.socket";
import { OnlineUsers } from "@/modules/chat/online.users";
import { AppError } from "@/utils/app.error";
import { verifyAccessToken } from "@/utils/jwt";
import { registerNotificationSocketHandler } from "@/modules/notification/notification.socket";
let ioRef = null;
export const getIO = () => ioRef;
export const socketHandler = (io) => {
    ioRef = io;
    io.use((socket, next) => {
        const { token } = socket.handshake.auth;
        if (!token)
            return next(new AppError("Unauthorized", 401));
        try {
            const decoded = verifyAccessToken(token);
            if (!decoded?.id)
                return next(new AppError("Unauthorized", 401));
            socket.data.userId = decoded.id;
            next();
        }
        catch (error) {
            return next(new AppError("Unauthorized", 401));
        }
    });
    io.on("connection", (socket) => {
        // Join a personal room named by the user id
        socket.join(socket.data.userId);
        OnlineUsers.addToOnlineUsers(socket.data.userId);
        io.emit("online_users", OnlineUsers.list());
        console.log(`User ${socket.data.userId} connected`);
        // Send the current online user list on request (e.g. when entering the chat page)
        socket.on("get_online_users", () => {
            socket.emit("online_users", OnlineUsers.list());
        });
        // Chat Socket Handler
        registerChatSocketHandler(io, socket);
        // Notification Socket Handler
        registerNotificationSocketHandler(io, socket);
        // Disconnect
        socket.on("disconnect", (reason) => {
            if (socket.data.chatId)
                ChatPresence.leave(socket.data.chatId, socket.data.userId);
            OnlineUsers.removeFromOnlineUsers(socket.data.userId);
            io.emit("online_users", OnlineUsers.list());
            console.log(`Disconnected: ${reason}`);
        });
    });
};
