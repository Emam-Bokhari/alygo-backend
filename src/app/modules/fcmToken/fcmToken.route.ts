import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { FcmTokenController } from "./fcmToken.controller";

const router = express.Router();

router.post(
  "/save-token",
  auth(
    USER_ROLES.USER,
    USER_ROLES.DRIVER,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  FcmTokenController.saveDeviceToken,
);

export const FcmTokenRoutes = router;
