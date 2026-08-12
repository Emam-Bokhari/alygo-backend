import express from "express";
import auth from "../../middlewares/auth";
import { AdminRewardsController } from "./adminRewards.controller";
import { requirePermission } from "../../middlewares/requirePermission";
import { isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

// Dashboard and CSV export
router.get(
  "/dashboard",
  auth(),
  requirePermission("adminrewards"),
  AdminRewardsController.getAdminRewardsDashboard,
);

router.get(
  "/export",
  auth(),
  requirePermission("adminrewards"),
  AdminRewardsController.exportRewardsCSV,
);

// Manual override targets
router.post(
  "/override-points",
  auth(),
  requirePermission("adminrewards"),
  AdminRewardsController.overrideDriverPoints,
);

router.post(
  "/override-tier",
  auth(),
  requirePermission("adminrewards"),
  AdminRewardsController.overrideDriverTier,
);

// CRUD point rules
router
  .route("/point-rules")
  .post(
    auth(),
    requirePermission("adminrewards"),
    AdminRewardsController.createPointRule,
  )
  .get(isAuthenticated, AdminRewardsController.getPointRules);

router
  .route("/point-rules/:id")
  .patch(
    auth(),
    requirePermission("adminrewards"),
    AdminRewardsController.updatePointRule,
  )
  .delete(
    auth(),
    requirePermission("adminrewards"),
    AdminRewardsController.deletePointRule,
  );

export const AdminRewardsRoutes = router;
