import express from "express";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";
import validateRequest from "../../middlewares/validateRequest";
import { PassengerManagementControllers } from "./passengerManagement.controller";
import { PassengerManagementValidation } from "./passengerManagement.validation";

const router = express.Router();

router.get(
  "/",
  auth(),
  requirePermission("passengermanagement.read"),
  PassengerManagementControllers.getPassengersOverview,
);

router.get(
  "/live-activity",
  auth(),
  requirePermission("passengermanagement.read"),
  PassengerManagementControllers.getLivePassengers,
);

router.get(
  "/suspended",
  auth(),
  requirePermission("passengermanagement.read"),
  PassengerManagementControllers.getSuspendedPassengers,
);

router.get(
  "/live-activity/:passengerId",
  auth(),
  requirePermission("passengermanagement.read"),
  validateRequest(PassengerManagementValidation.passengerIdParamSchema),
  PassengerManagementControllers.getLivePassengerDetails,
);

router.get(
  "/:passengerId",
  auth(),
  requirePermission("passengermanagement.read"),
  validateRequest(PassengerManagementValidation.passengerIdParamSchema),
  PassengerManagementControllers.getPassengerDetails,
);

router.post(
  "/:passengerId/suspend",
  auth(),
  requirePermission("passengermanagement.creaate"),
  validateRequest(PassengerManagementValidation.suspendPassengerZodSchema),
  PassengerManagementControllers.suspendPassenger,
);

router.post(
  "/:passengerId/create",
  auth(),
  requirePermission("passengermanagement.creaate"),
  PassengerManagementControllers.unsuspendPassenger,
);

export const PassengerManagementRoutes = router;
