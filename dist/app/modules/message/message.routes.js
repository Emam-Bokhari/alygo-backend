"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRoutes = void 0;
const express_1 = __importDefault(require("express"));
const message_controller_1 = require("./message.controller");
const user_1 = require("../../../enums/user");
const files_1 = require("../../../enums/files");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const parseFileData_1 = require("../../middlewares/parseFileData");
const flieUploadHandler_1 = __importDefault(require("../../middlewares/flieUploadHandler"));
const router = express_1.default.Router();
// Existing routes
router.post("/send-message/:chatId", (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER, user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN), (0, flieUploadHandler_1.default)(), (0, parseFileData_1.parseFileData)({ fieldName: files_1.FOLDER_NAMES.IMAGE, mode: "single" }), message_controller_1.MessageController.sendMessage);
router.get("/:chatId", (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER, user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN), message_controller_1.MessageController.getMessages);
router.delete("/delete/:messageId", (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER, user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN), message_controller_1.MessageController.deleteMessage);
// New route for pin/unpin message
router.patch("/pin-unpin/:messageId", (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER, user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN), message_controller_1.MessageController.pinUnpinMessage);
exports.MessageRoutes = router;
