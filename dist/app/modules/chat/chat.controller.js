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
exports.ChatController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const chat_service_1 = require("./chat.service");
const createChat = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const participant = req.body.participant;
    const { id: userId } = req.user;
    const participants = [userId, participant];
    const result = yield chat_service_1.ChatService.createChatIntoDB(participants);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Chat created successfully",
        data: result,
    });
}));
const markChatAsRead = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const user = req === null || req === void 0 ? void 0 : req.user;
    const result = yield chat_service_1.ChatService.markChatAsRead(user.id, id);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Chat marked as read",
        data: result,
    });
}));
const getChats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: userId } = req.user;
    const result = yield chat_service_1.ChatService.getAllChatsFromDB(userId, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Chats retrieved successfully",
        data: {
            chats: result.data,
            unreadChatsCount: result.unreadChatsCount,
            totalUnreadMessages: result.totalUnreadMessages,
        },
        meta: result.meta,
    });
}));
const getChatImages = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: userId } = req.user;
    const { chatId } = req.params;
    const result = yield chat_service_1.ChatService.getChatImagesFromDB(chatId, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Chat images retrieved successfully",
        data: result,
    });
}));
const deleteChat = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: userId } = req.user;
    const { chatId } = req.params;
    const result = yield chat_service_1.ChatService.softDeleteChatForUser(chatId, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Chat deleted successfully",
        data: result,
    });
}));
exports.ChatController = {
    createChat,
    getChats,
    markChatAsRead,
    deleteChat,
    getChatImages,
};
