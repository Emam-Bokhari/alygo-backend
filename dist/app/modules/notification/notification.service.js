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
exports.NotificationService = void 0;
const notification_model_1 = require("./notification.model");
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const notification_constant_1 = require("./notification.constant");
// get notifications
const getNotificationFromDB = (user, query) => __awaiter(void 0, void 0, void 0, function* () {
    const baseQuery = notification_model_1.Notification.find({ receiver: user.id }).populate([
        { path: "receiver" },
        { path: "sender" },
        {
            path: "referenceId",
            populate: {
                path: "carId",
                model: "Car",
                strictPopulate: false,
            },
        },
    ]);
    const unreadCount = yield notification_model_1.Notification.countDocuments({
        receiver: user.id,
        read: false,
    });
    const queryBuilder = new queryBuilder_1.default(baseQuery, query).sort().paginate();
    const result = yield queryBuilder.modelQuery;
    const meta = yield queryBuilder.countTotal();
    return {
        data: result,
        meta: Object.assign(Object.assign({}, meta), { unreadCount }),
    };
});
// read notifications only for user
const readNotificationToDB = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.Notification.updateMany({ receiver: user.id, read: false }, { $set: { read: true } });
    return result;
});
// get recent activities (last 5)
const getRecentActivitiesFromDB = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.Notification.find({ receiver: user.id })
        .populate([
        { path: "receiver" },
        { path: "sender" },
        {
            path: "referenceId",
            populate: {
                path: "carId",
                model: "Car",
                strictPopulate: false,
            },
        },
    ])
        .sort({ createdAt: -1 })
        .limit(5);
    return result;
});
// get notifications for admin
const adminNotificationFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const baseQuery = notification_model_1.Notification.find({
        type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
    }).populate([
        { path: "receiver" },
        { path: "sender" },
        {
            path: "referenceId",
            populate: {
                path: "carId",
                model: "Car",
                strictPopulate: false,
            },
        },
    ]);
    const unreadCount = yield notification_model_1.Notification.countDocuments({
        type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
        read: false,
    });
    const queryBuilder = new queryBuilder_1.default(baseQuery, query).sort().paginate();
    const result = yield queryBuilder.modelQuery;
    const meta = yield queryBuilder.countTotal();
    return {
        data: result,
        meta: Object.assign(Object.assign({}, meta), { unreadCount }),
    };
});
// read notifications only for admin
const adminReadNotificationToDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.Notification.updateMany({ type: notification_constant_1.NOTIFICATION_TYPE.ADMIN, read: false }, { $set: { read: true } }, { new: true });
    return result;
});
// get recent activities for admin (last 5)
const adminRecentActivitiesFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.Notification.find({ type: notification_constant_1.NOTIFICATION_TYPE.ADMIN })
        .populate([
        { path: "receiver" },
        { path: "sender" },
        {
            path: "referenceId",
            populate: {
                path: "carId",
                model: "Car",
                strictPopulate: false,
            },
        },
    ])
        .sort({ createdAt: -1 })
        .limit(5);
    return result;
});
// get single notification (user)
const getSingleNotificationFromDB = (user, id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.Notification.findOne({
        _id: id,
        receiver: user.id,
    }).populate([
        { path: "receiver" },
        { path: "sender" },
        {
            path: "referenceId",
            populate: {
                path: "carId",
                model: "Car",
                strictPopulate: false,
            },
        },
    ]);
    return result;
});
// read single notification (user)
const readSingleNotificationToDB = (user, id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.Notification.findOneAndUpdate({ _id: id, receiver: user.id }, { $set: { read: true } }, { new: true });
    return result;
});
// admin get single notification
const adminGetSingleNotificationFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.Notification.findOne({
        _id: id,
        type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
    }).populate([
        { path: "receiver" },
        { path: "sender" },
        {
            path: "referenceId",
            populate: {
                path: "carId",
                model: "Car",
                strictPopulate: false,
            },
        },
    ]);
    return result;
});
// admin read single notification
const adminReadSingleNotificationToDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield notification_model_1.Notification.findOneAndUpdate({ _id: id, type: notification_constant_1.NOTIFICATION_TYPE.ADMIN }, { $set: { read: true } }, { new: true });
    return result;
});
exports.NotificationService = {
    adminNotificationFromDB,
    getNotificationFromDB,
    readNotificationToDB,
    adminReadNotificationToDB,
    getRecentActivitiesFromDB,
    adminRecentActivitiesFromDB,
    getSingleNotificationFromDB,
    readSingleNotificationToDB,
    adminGetSingleNotificationFromDB,
    adminReadSingleNotificationToDB,
};
