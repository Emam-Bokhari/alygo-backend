import express from "express";
import { SystemConfigurationController } from "./systemConfiguration.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

router
  .route("/")
  .get(isAuthenticated, SystemConfigurationController.getSystemConfiguration)
  .patch(
    isAdmin,
    SystemConfigurationController.createOrUpdateSystemConfiguration,
  );

export const SystemConfigurationRoutes = router;
