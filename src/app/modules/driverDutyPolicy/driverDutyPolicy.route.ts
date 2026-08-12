import express from "express";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { DriverDutyPolicyController } from "./driverDutyPolicy.controller";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(
    auth(),
    requirePermission("driverdutypolicy"),
    DriverDutyPolicyController.createDriverDutyPolicy,
  )
  .get(isAuthenticated, DriverDutyPolicyController.getAllDriverDutyPolicies);

router.get(
  "/active",
  isAuthenticated,
  DriverDutyPolicyController.getActiveDriverDutyPolicies,
);

router.patch(
  "/status/:driverDutyPolicyId",
  auth(),
  requirePermission("driverdutypolicy"),
  DriverDutyPolicyController.updateDriverDutyPolicyStatus,
);

router
  .route("/:driverDutyPolicyId")
  .get(isAuthenticated, DriverDutyPolicyController.getDriverDutyPolicy)
  .patch(
    auth(),
    requirePermission("driverdutypolicy"),
    DriverDutyPolicyController.updateDriverDutyPolicy,
  )
  .delete(
    auth(),
    requirePermission("driverdutypolicy"),
    DriverDutyPolicyController.deleteDriverDutyPolicy,
  );

export const DriverDutyPolicyRoutes = router;

// New router instance for Admin Driver Duty Hour Rules module
const adminRouter = express.Router();

adminRouter.get(
  "/global",
  auth(),
  requirePermission("driverdutypolicy"),
  DriverDutyPolicyController.getGlobalRule,
);
adminRouter.get(
  "/states",
  auth(),
  requirePermission("driverdutypolicy"),
  DriverDutyPolicyController.getStateRules,
);
adminRouter.get(
  "/cities",
  auth(),
  requirePermission("driverdutypolicy"),
  DriverDutyPolicyController.getCityRules,
);
adminRouter.get(
  "/zones",
  auth(),
  requirePermission("driverdutypolicy"),
  DriverDutyPolicyController.getZoneRules,
);
adminRouter.get(
  "/airports",
  auth(),
  requirePermission("driverdutypolicy"),
  DriverDutyPolicyController.getAirportRules,
);
adminRouter.get(
  "/cards",
  auth(),
  requirePermission("driverdutypolicy"),
  DriverDutyPolicyController.getMonitoringCards,
);
adminRouter.get(
  "/monitoring/drivers",
  auth(),
  requirePermission("driverdutypolicy"),
  DriverDutyPolicyController.getDriverMonitoringList,
);

export const DriverDutyPolicyAdminRoutes = adminRouter;
