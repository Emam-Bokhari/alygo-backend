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
exports.MessageController = void 0;
const message_service_1 = require("./message.service");
const chat_service_1 = require("../chat/chat.service");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const sendMessage = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = req.params.chatId;
    const { id: userId } = req.user;
    req.body.sender = userId;
    req.body.chatId = chatId;
    const message = yield message_service_1.MessageService.sendMessageToDB(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Send Message Successfully",
        data: message,
    });
}));
const getMessages = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { chatId } = req.params;
    const { id: userId } = req.user;
    // Mark messages as read when user opens the chat
    yield chat_service_1.ChatService.markChatAsRead(userId, chatId);
    const result = yield message_service_1.MessageService.getMessagesFromDB(chatId, userId, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Messages retrieved successfully",
        data: {
            messages: result.messages,
            pinnedMessages: result.pinnedMessages,
        },
        meta: {
            limit: result.pagination.limit,
            page: result.pagination.page,
            total: result.pagination.total,
            totalPage: result.pagination.totalPage,
        },
    });
}));
const deleteMessage = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: userId } = req.user;
    const { messageId } = req.params;
    const messages = yield message_service_1.MessageService.deleteMessage(userId, messageId);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Message Deleted Successfully",
        data: messages,
    });
}));
// New controller: Pin/Unpin message
const pinUnpinMessage = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: userId } = req.user;
    const { messageId } = req.params;
    const { action } = req.body; // 'pin' or 'unpin'
    const result = yield message_service_1.MessageService.pinUnpinMessage(userId, messageId, action);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: `Message ${action}ned successfully`,
        data: result,
    });
}));
exports.MessageController = {
    sendMessage,
    getMessages,
    deleteMessage,
    pinUnpinMessage,
};
