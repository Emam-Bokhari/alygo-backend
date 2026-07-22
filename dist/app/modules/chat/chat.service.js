"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const chat_model_1 = require("./chat.model");
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = require("../user/user.model");
const message_model_1 = require("../message/message.model");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const createChatIntoDB = (participants) => __awaiter(void 0, void 0, void 0, function* () {
    const isExistChat = yield chat_model_1.Chat.findOne({
        participants: { $all: participants },
        isDeleted: { $ne: true },
    });
    if (isExistChat) {
        return isExistChat;
    }
    const newChat = yield chat_model_1.Chat.create({
        participants: participants,
        lastMessage: null,
    });
    if (!newChat) {
        throw new Error("Failed to create chat");
    }
    //@ts-ignore
    const io = global.io;
    newChat.participants.forEach((participant) => {
        //@ts-ignore
        io.emit(`newChat::${participant._id}`, newChat);
    });
    return newChat;
});
const markChatAsRead = (userId, chatId) => __awaiter(void 0, void 0, void 0, function* () {
    return chat_model_1.Chat.findByIdAndUpdate(chatId, { $addToSet: { readBy: userId } }, { new: true });
});
// 5. Updated getAllChatsFromDB with better unread count calculation
const getAllChatsFromDB = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const searchTerm = (_a = query.searchTerm) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    const chatQuery = {
        participants: { $in: [userId] },
        deletedBy: { $ne: userId },
        isDeleted: { $ne: true }, // new field
    };
    let chats;
    let totalChats;
    if (searchTerm) {
        const allChats = yield chat_model_1.Chat.find(chatQuery)
            .populate("lastMessage")
            .lean()
            .sort({ updatedAt: -1 });
        const allChatLists = yield Promise.all(allChats.map((chat) => __awaiter(void 0, void 0, void 0, function* () {
            const otherParticipantIds = chat.participants.filter((participantId) => participantId.toString() !== userId);
            const otherParticipants = yield user_model_1.User.find({
                _id: { $in: otherParticipantIds },
            })
                .select("_id firstName lastName profileImage email role")
                .lean();
            const unreadCount = yield message_model_1.Message.countDocuments({
                chatId: chat._id,
                sender: { $ne: userId },
                read: false,
                isDeleted: false,
            });
            return Object.assign(Object.assign({}, chat), { participants: otherParticipants, isRead: unreadCount === 0, // Chat is read if no unread messages
                unreadCount });
        })));
        const filteredChats = allChatLists.filter((chat) => {
            return chat.participants.some((participant) => participant.name.toLowerCase().includes(searchTerm));
        });
        totalChats = filteredChats.length;
        chats = filteredChats.slice(skip, skip + limit);
    }
    else {
        totalChats = yield chat_model_1.Chat.countDocuments(chatQuery);
        const rawChats = yield chat_model_1.Chat.find(chatQuery)
            .populate("lastMessage")
            .lean()
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);
        chats = yield Promise.all(rawChats.map((chat) => __awaiter(void 0, void 0, void 0, function* () {
            // const otherParticipantIds = chat.participants.filter((participantId) => participantId.toString() !== userId);
            const otherParticipantIds = chat.participants.filter((participantId) => participantId && participantId.toString() !== userId);
            const otherParticipants = yield user_model_1.User.find({
                _id: { $in: otherParticipantIds },
            })
                .select("_id firstName lastName profileImage email role")
                .lean();
            // FIXED: Same unread count calculation
            const unreadCount = yield message_model_1.Message.countDocuments({
                chatId: chat._id,
                sender: { $ne: userId },
                read: false,
                isDeleted: false,
            });
            return Object.assign(Object.assign({}, chat), { participants: otherParticipants, isRead: unreadCount === 0, unreadCount });
        })));
    }
    const unreadChatsCount = chats.filter((chat) => chat.unreadCount > 0).length;
    const totalUnreadMessages = chats.reduce((total, chat) => total + chat.unreadCount, 0);
    const totalPage = Math.ceil(totalChats / limit);
    return {
        data: chats,
        unreadChatsCount,
        totalUnreadMessages,
        meta: {
            limit,
            page,
            total: totalChats,
            totalPage,
        },
    };
});
const getChatImagesFromDB = (chatId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    // check chat existence
    const chat = yield chat_model_1.Chat.findById(chatId);
    if (!chat) {
        throw new ApiErrors_1.default(404, "Chat not found");
    }
    // verify user is participant
    const isParticipant = chat.participants.some((p) => p.toString() === userId.toString());
    if (!isParticipant) {
        throw new ApiErrors_1.default(403, "You are not a participant in this chat");
    }
    // ========================GET IMAGES DATA=======================
    const images = yield message_model_1.Message.find({
        chatId,
        sender: userId,
        isDeleted: { $ne: true },
        $or: [{ type: "image" }, { type: "both" }],
    })
        .sort({ createdAt: -1 })
        .select("image -_id")
        .lean();
    // return only image URLs as array
    return images.map((msg) => msg.image);
});
const softDeleteChatForUser = (chatId, id) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = new mongoose_1.default.Types.ObjectId(id);
    const chat = yield chat_model_1.Chat.findById(chatId);
    if (!chat) {
        throw new ApiErrors_1.default(404, "Chat not found");
    }
    if (!chat.participants.some((id) => id.toString() === userId.toString())) {
        throw new ApiErrors_1.default(401, "User is not authorized");
    }
    // If already deleted by this user, just return
    if (chat.deletedBy.some((id) => id.toString() === userId.toString())) {
        return chat;
    }
    // Add userId to deletedBy array
    chat.deletedBy.push(userId);
    // Optional: If all participants deleted, mark status deleted (soft delete for everyone)
    if (chat.deletedBy.length === chat.participants.length) {
        chat.isDeleted = true;
    }
    yield chat.save();
    //@ts-ignore
    const io = global.io;
    chat.participants.forEach((participant) => {
        //@ts-ignore
        io.emit(`chatDeletedForUser::${participant._id}`, { chatId, userId });
    });
    return chat;
});
exports.ChatService = {
    createChatIntoDB,
    getAllChatsFromDB,
    markChatAsRead,
    softDeleteChatForUser,
    getChatImagesFromDB,
};
