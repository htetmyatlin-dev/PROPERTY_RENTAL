import { ChatRepository } from "@/repositories/chat.repository";
import { MessageRepository } from "@/repositories/message.repository";
import {Server, Socket} from "socket.io";
import { ChatPresence } from "./chat.presence";
import { ChatReadRepository } from "@/repositories/chatread.repository";
import { UserRepository } from "@/repositories/user.repository";
import { notifyUser } from "@/utils/notify";

export const registerChatSocketHandler = (io: Server, socket: Socket) => {
    const id = socket.data.userId;

    /**
     * Join a chat room. If the chat does not exit, create a new chat room and join it.
     * Then, fetch the chat messages
     */
    socket.on("join_chat", async ({ landlordId, tenantId, propertyId } : { landlordId: string, tenantId: string, propertyId: string }, callback?: (payload: { chatId: string }) => void) => {
        const chat = await ChatRepository.findOrCreateChat(landlordId, tenantId, propertyId);
        // leave previously active chat room
        if (socket.data.chatId && socket.data.chatId !== chat.id) {
            socket.leave(socket.data.chatId);
            ChatPresence.leave(socket.data.chatId, id);
        }
        socket.join(chat.id);
        socket.data.chatId = chat.id;
        ChatPresence.join(chat.id, id);
        const messages = await MessageRepository.getChatMessages(chat.id);
        socket.emit("chat_messages", messages);

        const lastMsg = messages[messages.length-1];
        // entering the chat makes the last message as read
        if (lastMsg) {
            await ChatReadRepository.markRead(chat.id, id, lastMsg.id);
            socket.to(chat.id).emit("chat_read", { chatId: chat.id, lastReadMessageId: lastMsg.id })
            io.to(id).emit("unread_count_updated", { chatId: chat.id, unreadCount: 0 })
        }
        callback?.({ chatId: chat.id });
    })

    /**
     * Send a message to the chat room
     */
    socket.on("send_message", async (content: string) => {
        const chatId = socket.data.chatId;
        const safeContent = content.trim();
        if (!chatId || !safeContent) return;
        const message = await MessageRepository.createMessage(chatId, id, safeContent);
        const lastMessage = `${message.senderId}:${message.content}`;
        await ChatRepository.updateLastMessage(chatId, lastMessage);
        io.to(chatId).emit("receive_message", message);
        io.to(chatId).emit("last_message_updated", { chatId, lastMessage });
        const chat = await ChatRepository.getById(chatId);
        const receiverId = chat?.landlordId === id ? chat?.tenantId : chat?.landlordId;
        // Always keep the receiver's chat list preview up to date, even when they
        // are not viewing the chat (i.e. not a member of the chat room).
        io.to(receiverId as string).emit("last_message_updated", { chatId, lastMessage });
        if (ChatPresence.isViewing(chatId, receiverId as string)) {
            await ChatReadRepository.markRead(chatId, receiverId as string, message.id );
            socket.emit("chat_read", { chatId, userId: receiverId, lastReadMessageId: message.id })
        } else {
            const updated = await ChatReadRepository.increaseUnreadCount(chatId, receiverId as string);
            const chatForReceiver = await ChatRepository.getByIdForUser(chatId, receiverId as string);
            const sender = await UserRepository.findById(id);
            const senderName = sender?.username ?? "a user";
            const preview = safeContent.length > 80 ? `${safeContent.slice(0, 77)}...` : safeContent;
            await notifyUser(
                receiverId as string,
                `New message from ${senderName}`,
                `${senderName}: ${preview}`,
            );
            io.to(receiverId as string).emit("unread_count_updated", { chatId, unreadCount: updated.unreadCount, chat: chatForReceiver });
        }
    })

    /**
     * Edit a message in the chat room
     */
    socket.on("edit_message", async ({ messageId, newContent } : { messageId: string, newContent: string }) => {
        const message = await MessageRepository.editMessage(messageId, newContent);
        const chatId = socket.data.chatId
        io.to(chatId).emit("message_edited", message);
        const lastMsg = await MessageRepository.getLastMessage(chatId)
        if (messageId === lastMsg[0]?.id) {
            const lastMessage = `${lastMsg[0].senderId}:${lastMsg[0].content}`
            await ChatRepository.updateLastMessage(chatId, lastMessage);
            io.emit("last_message_updated", { chatId, lastMessage });
        }
    })

    /**
     * Delete a message in the chat room
     */
    socket.on("delete_message", async (messageId: string) => {
        const chatId = socket.data.chatId;
        const lastMsg = await MessageRepository.getLastMessage(chatId);
        await MessageRepository.deleteMessage(messageId);
        if (messageId) io.to(socket.data.chatId).emit("message_deleted", messageId);
        if (messageId === lastMsg[0]?.id) {
            const lastMessage = lastMsg[1] ? `${lastMsg[1].senderId}:${lastMsg[1].content}` : ""
            await ChatRepository.updateLastMessage(chatId, lastMessage);
            io.emit("last_message_updated", { chatId, lastMessage });
        }
    })

    /**
     * Notify other user in the chat room that the user is typing
     */
    socket.on("typing", (isTyping: Boolean) => {
        socket.to(socket.data.chatId).emit("user_typing", { userId: id, isTyping });
    })

    /**
     * Fetch the list of chats for the user
     */
    socket.on("chat_list", async (userId: string) => {
        const chats = await ChatRepository.getChatsByUser(userId);
        socket.emit("chat_list_fetched", chats);
    })

    /**
     * Leave the chat room
     */
    socket.on("leave_chat", () => {
        if (socket.data.chatId) {
            ChatPresence.leave(socket.data.chatId, id)
            socket.leave(socket.data.chatId)
            socket.data.chatId = undefined
        }
    })
}