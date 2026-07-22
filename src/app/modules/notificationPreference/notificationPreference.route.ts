import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { NotificationPreferenceController } from "./notificationPreference.controller";

const router = express.Router();

// user routes
router
  .route("/")
  .get(
    auth(USER_ROLES.USER, USER_ROLES.DRIVER),
    NotificationPreferenceController.getNotificationPreference,
  )
  .patch(
    auth(USER_ROLES.USER, USER_ROLES.DRIVER),
    NotificationPreferenceController.updateNotificationPreference,
  )
  .delete(
    auth(USER_ROLES.USER, USER_ROLES.DRIVER),
    NotificationPreferenceController.deleteNotificationPreference,
  );

export const NotificationPreferenceRoutes = router;
