import express from "express";
import { isAdmin } from "../../../helpers/authHelper";
import { PlatformSettingsController } from "./platformSettings.controller";

const router = express.Router();

router
  .route("/")
  .get(PlatformSettingsController.getPlatformSettings)
  .patch(isAdmin, PlatformSettingsController.createOrUpdatePlatformSettings);

export const PlatformSettingsRoutes = router;
