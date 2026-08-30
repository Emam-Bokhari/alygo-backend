import express from "express";
import { SystemConfigurationController } from "./systemConfiguration.controller";
import { isAuthenticated } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/docs")
  .get(SystemConfigurationController.getSystemConfigurationDocsHtml);

router
  .route("/")
  .get(isAuthenticated, SystemConfigurationController.getSystemConfiguration)
  .patch(
    auth(),
    requirePermission("systemconfiguration"),
    SystemConfigurationController.createOrUpdateSystemConfiguration,
  );

export const SystemConfigurationRoutes = router;
