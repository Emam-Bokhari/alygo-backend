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
exports.FcmTokenService = void 0;
const logger_1 = require("../../../shared/logger");
const colors_1 = __importDefault(require("colors"));
const fcmToken_model_1 = require("./fcmToken.model");
const saveDeviceToken = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield fcmToken_model_1.DeviceToken.deleteMany({
            fcmToken: payload.fcmToken,
            userId: { $ne: userId },
        });
        // Step 2: Upsert - userId + deviceId combination
        const result = yield fcmToken_model_1.DeviceToken.findOneAndUpdate({
            userId: userId,
            deviceId: payload.deviceId,
        }, {
            $set: {
                fcmToken: payload.fcmToken,
                deviceType: payload.deviceType,
                updatedAt: new Date(),
            },
        }, {
            upsert: true,
            new: true,
            runValidators: true,
        });
        logger_1.logger.info(colors_1.default.green(`✅ Token saved: User ${userId}, Device ${payload.deviceId}`));
        return result;
    }
    catch (error) {
        logger_1.logger.error(colors_1.default.red("❌ Error saving device token:"), error);
        throw error;
    }
});
exports.FcmTokenService = {
    saveDeviceToken,
};
