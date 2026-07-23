import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { PointsController } from "./points.controller";
import { DestinationFilterController } from "./destinationFilter.controller";

const router = express.Router();

// Driver Dashboard
router.get(
  "/tier/dashboard",
  auth(USER_ROLES.DRIVER),
  PointsController.getDriverTierDashboard,
);

// Driver Tier Benefits list
router.get(
  "/tier/benefits",
  auth(USER_ROLES.DRIVER),
  PointsController.getDriverTierBenefits,
);

// Driver Points History
router.get(
  "/points/history",
  auth(USER_ROLES.DRIVER),
  PointsController.getDriverPointsHistory,
);

// How Points Work configuration rules list
router.get(
  "/points/rules",
  auth(USER_ROLES.DRIVER),
  PointsController.getDriverPointRules,
);

// Destination Filter endpoints
router
  .route("/destination-filter")
  .get(auth(USER_ROLES.DRIVER), DestinationFilterController.getFilterStatus)
  .post(auth(USER_ROLES.DRIVER), DestinationFilterController.activateFilter);

router.patch(
  "/destination-filter/cancel",
  auth(USER_ROLES.DRIVER),
  DestinationFilterController.cancelFilter,
);

export const DriverRewardsRoutes = router;
