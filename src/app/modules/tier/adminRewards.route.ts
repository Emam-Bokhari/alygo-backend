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
  requirePermission("adminrewards.read"),
  AdminRewardsController.getAdminRewardsDashboard,
);

router.get(
  "/export",
  auth(),
  requirePermission("adminrewards.export"),
  AdminRewardsController.exportRewardsCSV,
);

// Manual override targets
router.post(
  "/override-points",
  auth(),
  requirePermission("adminrewards.override"),
  AdminRewardsController.overrideDriverPoints,
);

router.post(
  "/override-tier",
  auth(),
  requirePermission("adminrewards.override"),
  AdminRewardsController.overrideDriverTier,
);

// CRUD point rules
router
  .route("/point-rules")
  .post(
    auth(),
    requirePermission("adminrewards.create"),
    AdminRewardsController.createPointRule,
  )
  .get(isAuthenticated, AdminRewardsController.getPointRules);

router
  .route("/point-rules/:id")
  .patch(
    auth(),
    requirePermission("adminrewards.update"),
    AdminRewardsController.updatePointRule,
  )
  .delete(
    auth(),
    requirePermission("adminrewards.delete"),
    AdminRewardsController.deletePointRule,
  );

export const AdminRewardsRoutes = router;
