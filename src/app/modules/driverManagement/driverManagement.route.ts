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
  requirePermission("drivermanagement"),
  DriverManagementControllers.getDriversOverview,
);

router.get(
  "/overview",
  auth(),
  requirePermission("drivermanagement"),
  DriverManagementControllers.getOverviewSummary,
);

router.get(
  "/online",
  auth(),
  requirePermission("drivermanagement"),
  DriverManagementControllers.getOnlineDrivers,
);

router.get(
  "/pending-approval",
  auth(),
  requirePermission("drivermanagement"),
  DriverManagementControllers.getPendingApprovalDrivers,
);

router.get(
  "/suspended",
  auth(),
  requirePermission("drivermanagement"),
  DriverManagementControllers.getSuspendedDrivers,
);

router.get(
  "/compliance",
  auth(),
  requirePermission("drivermanagement"),
  DriverManagementControllers.getComplianceDrivers,
);

router.get(
  "/drivers/:driverId",
  auth(),
  requirePermission("drivermanagement"),
  validateRequest(DriverManagementValidation.getDriverDetailsZodSchema),
  DriverManagementControllers.getDriverDetails,
);

router.post(
  "/drivers/:driverId/approve",
  auth(),
  requirePermission("drivermanagement"),
  DriverManagementControllers.createApproveDriver,
);

router.post(
  "/drivers/:driverId/reject",
  auth(),
  requirePermission("drivermanagement"),
  validateRequest(DriverManagementValidation.rejectDriverZodSchema),
  DriverManagementControllers.createRejectDriver,
);

router.post(
  "/drivers/:driverId/suspend",
  auth(),
  requirePermission("drivermanagement"),
  validateRequest(DriverManagementValidation.suspendDriverZodSchema),
  DriverManagementControllers.suspendDriver,
);

router.post(
  "/drivers/:driverId/create",
  auth(),
  requirePermission("drivermanagement"),
  DriverManagementControllers.unsuspendDriver,
);

export const DriverManagementRoutes = router;
