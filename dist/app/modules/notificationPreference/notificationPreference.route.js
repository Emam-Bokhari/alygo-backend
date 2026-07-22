"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPreferenceRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const notificationPreference_controller_1 = require("./notificationPreference.controller");
const router = express_1.default.Router();
// user routes
router
    .route("/")
    .get((0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER), notificationPreference_controller_1.NotificationPreferenceController.getNotificationPreference)
    .patch((0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER), notificationPreference_controller_1.NotificationPreferenceController.updateNotificationPreference)
    .delete((0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER), notificationPreference_controller_1.NotificationPreferenceController.deleteNotificationPreference);
exports.NotificationPreferenceRoutes = router;
