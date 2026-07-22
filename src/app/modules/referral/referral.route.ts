import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { ReferralController } from "./referral.controller";

const router = express.Router();

router.get(
  "/user-info",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReferralController.getUserInfo,
);

router.get(
  "/driver-info",
  auth(USER_ROLES.DRIVER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReferralController.getDriverInfo,
);

router.get(
  "/driver-progress",
  auth(USER_ROLES.DRIVER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReferralController.getDriverProgress,
);

router.get(
  "/driver-payouts",
  auth(USER_ROLES.DRIVER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReferralController.getDriverPayouts,
);

router.get("/rules", ReferralController.getRules);

router.post("/verify", ReferralController.verifyCode);

export const ReferralRoutes = router;
