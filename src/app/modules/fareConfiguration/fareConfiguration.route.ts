import express from "express";
import { FareConfigurationController } from "./fareConfiguration.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(
    auth(),
    requirePermission("fareconfiguration.create"),
    FareConfigurationController.createFareConfiguration,
  )
  .get(
    auth(),
    requirePermission("fareconfiguration.read"),
    FareConfigurationController.getAllFareConfiguration,
  );

router.get(
  "/active",
  isAuthenticated,
  FareConfigurationController.getActiveFareConfigurations,
);

router.get(
  "/category/:serviceCategoryId/:rideCategoryId",
  isAuthenticated,
  FareConfigurationController.getFareConfigurationByCategory,
);

router.patch(
  "/status/:fareConfigurationId",
  auth(),
  requirePermission("fareconfiguration.update"),
  FareConfigurationController.updateFareConfigurationStatus,
);

router
  .route("/:fareConfigurationId")
  .get(isAuthenticated, FareConfigurationController.getFareConfiguration)
  .patch(
    auth(),
    requirePermission("fareconfiguration.update"),
    FareConfigurationController.updateFareConfiguration,
  )
  .delete(
    auth(),
    requirePermission("fareconfiguration.delete"),
    FareConfigurationController.deleteFareConfiguration,
  );

export const FareConfigurationRoutes = router;
