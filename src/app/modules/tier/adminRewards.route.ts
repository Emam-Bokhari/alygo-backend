import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { AdminRewardsController } from "./adminRewards.controller";

const router = express.Router();

// Dashboard and CSV export
router.get(
  "/dashboard",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminRewardsController.getAdminRewardsDashboard,
);

router.get(
  "/export",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminRewardsController.exportRewardsCSV,
);

// Manual override targets
router.post(
  "/override-points",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminRewardsController.overrideDriverPoints,
);

router.post(
  "/override-tier",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AdminRewardsController.overrideDriverTier,
);

// CRUD point rules
router
  .route("/point-rules")
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    AdminRewardsController.createPointRule,
  )
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    AdminRewardsController.getPointRules,
  );

router
  .route("/point-rules/:id")
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    AdminRewardsController.updatePointRule,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    AdminRewardsController.deletePointRule,
  );

export const AdminRewardsRoutes = router;
