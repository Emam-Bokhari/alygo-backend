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
