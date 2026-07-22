"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcmTokenRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const fcmToken_controller_1 = require("./fcmToken.controller");
const router = express_1.default.Router();
router.post(
  "/save-token",
  (0, auth_1.default)(
    user_1.USER_ROLES.USER,
    user_1.USER_ROLES.DRIVER,
    user_1.USER_ROLES.ADMIN,
    user_1.USER_ROLES.SUPER_ADMIN,
  ),
  fcmToken_controller_1.FcmTokenController.saveDeviceToken,
);
exports.FcmTokenRoutes = router;
