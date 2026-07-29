import express from "express";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { DriverDutyPolicyController } from "./driverDutyPolicy.controller";

const router = express.Router();

router
  .route("/")
  .post(isAdmin, DriverDutyPolicyController.createDriverDutyPolicy)
  .get(isAuthenticated, DriverDutyPolicyController.getAllDriverDutyPolicies);

router.get(
  "/active",
  isAuthenticated,
  DriverDutyPolicyController.getActiveDriverDutyPolicies,
);

router.patch(
  "/status/:driverDutyPolicyId",
  isAdmin,
  DriverDutyPolicyController.updateDriverDutyPolicyStatus,
);

router
  .route("/:driverDutyPolicyId")
  .get(isAuthenticated, DriverDutyPolicyController.getDriverDutyPolicy)
  .patch(isAdmin, DriverDutyPolicyController.updateDriverDutyPolicy)
  .delete(isAdmin, DriverDutyPolicyController.deleteDriverDutyPolicy);

export const DriverDutyPolicyRoutes = router;

// New router instance for Admin Driver Duty Hour Rules module
const adminRouter = express.Router();

adminRouter.get("/global", isAdmin, DriverDutyPolicyController.getGlobalRule);
adminRouter.get("/states", isAdmin, DriverDutyPolicyController.getStateRules);
adminRouter.get("/cities", isAdmin, DriverDutyPolicyController.getCityRules);
adminRouter.get("/zones", isAdmin, DriverDutyPolicyController.getZoneRules);
adminRouter.get(
  "/airports",
  isAdmin,
  DriverDutyPolicyController.getAirportRules,
);
adminRouter.get(
  "/cards",
  isAdmin,
  DriverDutyPolicyController.getMonitoringCards,
);
adminRouter.get(
  "/monitoring/drivers",
  isAdmin,
  DriverDutyPolicyController.getDriverMonitoringList,
);

export const DriverDutyPolicyAdminRoutes = adminRouter;
