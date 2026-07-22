import express from "express";
import { FareConfigurationController } from "./fareConfiguration.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

router
  .route("/")
  .post(isAdmin, FareConfigurationController.createFareConfiguration)
  .get(isAdmin, FareConfigurationController.getAllFareConfiguration);

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
  isAdmin,
  FareConfigurationController.updateFareConfigurationStatus,
);

router
  .route("/:fareConfigurationId")
  .get(isAuthenticated, FareConfigurationController.getFareConfiguration)
  .patch(isAdmin, FareConfigurationController.updateFareConfiguration)
  .delete(isAdmin, FareConfigurationController.deleteFareConfiguration);

export const FareConfigurationRoutes = router;
