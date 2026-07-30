import express from "express";
import { EmergencyHelplineController } from "./emergencyHelpline.controller";
import validateRequest from "../../middlewares/validateRequest";
import { EmergencyHelplineZodValidation } from "./emergencyHelpline.validation";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .patch(
    auth(),
    requirePermission("emergencyhelpline.update"),  
    validateRequest(
      EmergencyHelplineZodValidation.updateEmergencyHelplineValidationSchema,
    ),
    EmergencyHelplineController.upsertEmergencyHelpline,
  )
  .get(EmergencyHelplineController.getEmergencyHelpline);

export const EmergencyHelplineRoutes = router;
