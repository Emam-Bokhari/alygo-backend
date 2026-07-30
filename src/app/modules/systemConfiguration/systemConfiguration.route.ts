import express from "express";
import { SystemConfigurationController } from "./systemConfiguration.controller";
import { isAuthenticated } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .get(isAuthenticated, SystemConfigurationController.getSystemConfiguration)
  .patch(
    auth(),
    requirePermission("systemconfiguration.update"),
    SystemConfigurationController.createOrUpdateSystemConfiguration,
  );

export const SystemConfigurationRoutes = router;
