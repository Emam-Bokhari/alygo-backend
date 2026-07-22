"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRoutes = void 0;
const express_1 = require("express");
const chat_controller_1 = require("./chat.controller");
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const router = (0, express_1.Router)();
router.get(
  "/",
  (0, auth_1.default)(
    user_1.USER_ROLES.ADMIN,
    user_1.USER_ROLES.SUPER_ADMIN,
    user_1.USER_ROLES.USER,
    user_1.USER_ROLES.DRIVER,
  ),
  chat_controller_1.ChatController.getChats,
);
router.get(
  "/:chatId/images",
  (0, auth_1.default)(
    user_1.USER_ROLES.ADMIN,
    user_1.USER_ROLES.SUPER_ADMIN,
    user_1.USER_ROLES.USER,
    user_1.USER_ROLES.DRIVER,
  ),
  chat_controller_1.ChatController.getChatImages,
);
router.post(
  "/create-chat",
  (0, auth_1.default)(
    user_1.USER_ROLES.ADMIN,
    user_1.USER_ROLES.SUPER_ADMIN,
    user_1.USER_ROLES.USER,
    user_1.USER_ROLES.DRIVER,
  ),
  chat_controller_1.ChatController.createChat,
);
router.patch(
  "/mark-chat-as-read/:id",
  (0, auth_1.default)(
    user_1.USER_ROLES.ADMIN,
    user_1.USER_ROLES.SUPER_ADMIN,
    user_1.USER_ROLES.USER,
    user_1.USER_ROLES.DRIVER,
  ),
  chat_controller_1.ChatController.markChatAsRead,
);
router.delete(
  "/delete/:chatId",
  (0, auth_1.default)(
    user_1.USER_ROLES.ADMIN,
    user_1.USER_ROLES.SUPER_ADMIN,
    user_1.USER_ROLES.USER,
    user_1.USER_ROLES.DRIVER,
  ),
  chat_controller_1.ChatController.deleteChat,
);
exports.ChatRoutes = router;
