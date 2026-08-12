import express from "express";
import { isAdmin } from "../../../helpers/authHelper";
import { PlatformSettingsController } from "./platformSettings.controller";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .get(PlatformSettingsController.getPlatformSettings)
  .patch(
    auth(),
    requirePermission("platformsettings"),
    PlatformSettingsController.createOrUpdatePlatformSettings,
  );

export const PlatformSettingsRoutes = router;
