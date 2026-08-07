import express from "express";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";
import validateRequest from "../../middlewares/validateRequest";
import { DriverManagementControllers } from "./driverManagement.controller";
import { DriverManagementValidation } from "./driverManagement.validation";

const router = express.Router();

router.get(
  "/",
  auth(),
  requirePermission("drivermanagement.read"),
  DriverManagementControllers.getDriversOverview,
);

router.get(
  "/overview",
  auth(),
  requirePermission("drivermanagement.read"),
  DriverManagementControllers.getOverviewSummary,
);

router.get(
  "/online",
  auth(),
  requirePermission("drivermanagement.read"),
  DriverManagementControllers.getOnlineDrivers,
);

router.get(
  "/pending-approval",
  auth(),
  requirePermission("drivermanagement.read"),
  DriverManagementControllers.getPendingApprovalDrivers,
);

router.get(
  "/suspended",
  auth(),
  requirePermission("drivermanagement.read"),
  DriverManagementControllers.getSuspendedDrivers,
);

router.get(
  "/compliance",
  auth(),
  requirePermission("drivermanagement.read"),
  DriverManagementControllers.getComplianceDrivers,
);

router.get(
  "/drivers/:driverId",
  auth(),
  requirePermission("drivermanagement.read"),
  validateRequest(DriverManagementValidation.getDriverDetailsZodSchema),
  DriverManagementControllers.getDriverDetails,
);

router.post(
  "/drivers/:driverId/approve",
  auth(),
  requirePermission("drivermanagement.creaate"),
  DriverManagementControllers.createApproveDriver,
);

router.post(
  "/drivers/:driverId/reject",
  auth(),
  requirePermission("drivermanagement.creaate"),
  validateRequest(DriverManagementValidation.rejectDriverZodSchema),
  DriverManagementControllers.createRejectDriver,
);

router.post(
  "/drivers/:driverId/suspend",
  auth(),
  requirePermission("drivermanagement.creaate"),
  validateRequest(DriverManagementValidation.suspendDriverZodSchema),
  DriverManagementControllers.suspendDriver,
);

router.post(
  "/drivers/:driverId/create",
  auth(),
  requirePermission("drivermanagement.creaate"),
  DriverManagementControllers.unsuspendDriver,
);

export const DriverManagementRoutes = router;
