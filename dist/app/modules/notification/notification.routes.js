"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const notification_controller_1 = require("./notification.controller");
const router = express_1.default.Router();
router
  .route("/")
  .get(
    (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER),
    notification_controller_1.NotificationController.getNotificationFromDB,
  )
  .patch(
    (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER),
    notification_controller_1.NotificationController.readNotification,
  );
router.get(
  "/recent",
  (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER),
  notification_controller_1.NotificationController.getRecentActivities,
);
router
  .route("/admin")
  .get(
    (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
    notification_controller_1.NotificationController.adminNotificationFromDB,
  )
  .patch(
    (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
    notification_controller_1.NotificationController.adminReadNotification,
  );
router.get(
  "/admin/recent",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  notification_controller_1.NotificationController.adminRecentActivities,
);
// user routes
router.get(
  "/:id",
  (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER),
  notification_controller_1.NotificationController.getSingleNotification,
);
router.patch(
  "/:id/read",
  (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER),
  notification_controller_1.NotificationController.readSingleNotification,
);
// admin routes
router.get(
  "/admin/:id",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  notification_controller_1.NotificationController.adminGetSingleNotification,
);
router.patch(
  "/admin/:id/read",
  (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN),
  notification_controller_1.NotificationController.adminReadSingleNotification,
);
exports.NotificationRoutes = router;
