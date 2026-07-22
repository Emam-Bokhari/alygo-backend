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
exports.notificationHelper = void 0;
const user_model_1 = require("../modules/user/user.model");
const notification_model_1 = require("../modules/notification/notification.model");
const logger_1 = require("../../shared/logger");
const colors_1 = __importDefault(require("colors"));
const fcmToken_model_1 = require("../modules/fcmToken/fcmToken.model");
const firebase_1 = require("../../config/firebase");
const notification_constant_1 = require("../modules/notification/notification.constant");
class NotificationHelper {
    /**
     * 🟢 MAIN METHOD: SEND TO SINGLE USER
     * Usage: notificationHelper.sendToUser(userId, payload);
     */
    sendToUser(userId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.sendToBatch([userId], payload);
        });
    }
    /**
     * 🔵 MAIN METHOD: SEND TO MULTIPLE USERS
     * Usage: notificationHelper.sendToBatch([id1, id2, id3], payload);
     */
    sendToBatch(userIds, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!userIds.length)
                    return;
                // 1. Filter Users: Only get users who exist, are verified, and have notifications ON
                const validUsers = yield user_model_1.User.find({
                    _id: { $in: userIds },
                    // isVerified: true,
                    // notificationStatus: true,
                })
                    .select("_id")
                    .lean();
                const validUserIds = validUsers.map((u) => u._id);
                if (validUserIds.length === 0)
                    return;
                // 2. Fetch FCM Tokens for these users
                const tokensData = yield fcmToken_model_1.DeviceToken.find({
                    userId: { $in: validUserIds },
                    fcmToken: { $exists: true, $ne: "" },
                })
                    .select("fcmToken")
                    .lean();
                const fcmTokens = tokensData.map((t) => t.fcmToken);
                // --- PARALLEL EXECUTION START ---
                const tasks = [];
                // TASK A: Send Push Notifications (only if tokens exist)
                if (fcmTokens.length > 0) {
                    tasks.push(this.sendToFCM(fcmTokens, payload));
                }
                // TASK B: Save to Database (Always, even if they don't have a token)
                if (validUserIds.length > 0) {
                    tasks.push(this.saveToDatabase(validUserIds, payload));
                }
                yield Promise.allSettled(tasks);
                // --- PARALLEL EXECUTION END ---
                logger_1.logger.info(colors_1.default.green(`✅ Notification flow completed for ${validUserIds.length} users.`));
            }
            catch (error) {
                logger_1.logger.error(colors_1.default.red("❌ NotificationHelper Error:"), error);
            }
        });
    }
    /**
     * 🟠 SEND CHAT MESSAGE NOTIFICATION
     */
    sendChatMessage(chat, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const senderId = message.sender._id.toString();
                const senderName = message.sender.name ||
                    `${message.sender.firstName || ""} ${message.sender.lastName || ""}`.trim() ||
                    "User";
                // message format body
                let bodyText = message.text;
                if (message.isDeleted)
                    bodyText = "This message was deleted";
                if (!bodyText && message.productId)
                    bodyText = "Sent a product attachment";
                if (!bodyText)
                    bodyText = "Sent a new message";
                // Remove sender from recipients
                const recipients = chat.participants
                    .filter((p) => {
                    const pId = p._id ? p._id.toString() : p.toString();
                    return pId !== senderId;
                })
                    .map((p) => p._id || p);
                if (recipients.length === 0)
                    return;
                yield this.sendToBatch(recipients, {
                    title: senderName,
                    body: bodyText.substring(0, 100),
                    type: notification_constant_1.NOTIFICATION_TYPE.MESSAGE_NEW,
                    data: {
                        type: notification_constant_1.NOTIFICATION_TYPE.MESSAGE_NEW,
                        chatId: chat._id.toString(),
                        messageId: message._id.toString(),
                        click_action: "FLUTTER_NOTIFICATION_CLICK",
                    },
                });
            }
            catch (error) {
                logger_1.logger.error(colors_1.default.red("❌ Error inside sendChatMessage:"), error);
            }
        });
    }
    /**
     * 🔒 PRIVATE: Handle Firebase Logic & Token Cleanup
     * Chunks tokens into batches of 500 (Firebase limit)
     */
    sendToFCM(tokens, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // ✅ Fixed: Chunk tokens into batches of 500 (Firebase multicast limit)
                const BATCH_SIZE = 500;
                const chunks = [];
                for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
                    chunks.push(tokens.slice(i, i + BATCH_SIZE));
                }
                for (const chunk of chunks) {
                    const message = {
                        tokens: chunk,
                        notification: {
                            title: payload.title,
                            body: payload.body,
                        },
                        data: payload.data || {},
                    };
                    const response = yield firebase_1.firebaseAdmin
                        .messaging()
                        .sendEachForMulticast(message);
                    // Cleanup Invalid Tokens
                    if (response.failureCount > 0) {
                        const failedTokens = [];
                        response.responses.forEach((resp, idx) => {
                            var _a;
                            if (!resp.success) {
                                const errCode = (_a = resp.error) === null || _a === void 0 ? void 0 : _a.code;
                                if (errCode === "messaging/registration-token-not-registered" ||
                                    errCode === "messaging/mismatched-credential") {
                                    failedTokens.push(chunk[idx]);
                                }
                            }
                        });
                        if (failedTokens.length > 0) {
                            yield fcmToken_model_1.DeviceToken.deleteMany({ fcmToken: { $in: failedTokens } });
                            logger_1.logger.info(colors_1.default.yellow(`🗑️ Cleaned up ${failedTokens.length} invalid tokens.`));
                        }
                    }
                }
            }
            catch (error) {
                logger_1.logger.error(colors_1.default.red("FCM Send Error:"), error);
            }
        });
    }
    /**
     * 🔒 PRIVATE: Handle Database Saving
     */
    saveToDatabase(userIds, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const notifications = userIds.map((userId) => {
                    var _a, _b;
                    return ({
                        receiver: userId,
                        title: payload.title,
                        text: payload.body,
                        type: payload.type,
                        read: false,
                        referenceId: ((_a = payload.data) === null || _a === void 0 ? void 0 : _a.referenceId) || undefined,
                        referenceModel: ((_b = payload.data) === null || _b === void 0 ? void 0 : _b.referenceModel) || undefined,
                    });
                });
                yield notification_model_1.Notification.insertMany(notifications);
            }
            catch (error) {
                logger_1.logger.error(colors_1.default.red("DB Save Error:"), error);
            }
        });
    }
}
exports.notificationHelper = new NotificationHelper();
