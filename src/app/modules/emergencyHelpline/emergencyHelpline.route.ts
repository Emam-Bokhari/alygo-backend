import express from "express";
import { EmergencyHelplineController } from "./emergencyHelpline.controller";
import validateRequest from "../../middlewares/validateRequest";
import { EmergencyHelplineZodValidation } from "./emergencyHelpline.validation";
import { isAdmin } from "../../../helpers/authHelper";

const router = express.Router();

router
  .route("/")
  .patch(
    isAdmin,
    validateRequest(
      EmergencyHelplineZodValidation.updateEmergencyHelplineValidationSchema,
    ),
    EmergencyHelplineController.upsertEmergencyHelpline,
  )
  .get(EmergencyHelplineController.getEmergencyHelpline);

export const EmergencyHelplineRoutes = router;
