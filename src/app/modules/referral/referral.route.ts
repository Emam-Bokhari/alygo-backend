import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { ReferralController } from "./referral.controller";

const router = express.Router();

// --- NEW PASSENGER ROUTES ---
router.get(
  "/user/dashboard",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReferralController.getUserDashboard,
);

router.get(
  "/user/history",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReferralController.getReferredUsersHistory,
);

router.get(
  "/user/reward-history",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReferralController.getUserRewardHistory,
);

// --- NEW DRIVER ROUTES ---
router.get(
  "/driver/dashboard",
  auth(USER_ROLES.DRIVER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReferralController.getDriverDashboard,
);

router.get(
  "/driver/progress",
  auth(USER_ROLES.DRIVER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReferralController.getDriverReferralProgress,
);

router.get(
  "/driver/reward-history",
  auth(USER_ROLES.DRIVER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ReferralController.getDriverRewardHistory,
);

// --- OTHER ROUTES ---
router.get("/rules", ReferralController.getRules);
router.post("/verify", ReferralController.verifyCode);

export const ReferralRoutes = router;
