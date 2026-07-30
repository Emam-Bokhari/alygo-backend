import express from "express";
import { EmergencyContactController } from "./emergencyContact.controller";
import validateRequest from "../../middlewares/validateRequest";
import { EmergencyContactZodValidation } from "./emergencyContact.validation";
import { isUserOrDriver } from "../../../helpers/authHelper";

const router = express.Router();

router
  .route("/")
  .post(
    isUserOrDriver,
    validateRequest(
      EmergencyContactZodValidation.createEmergencyContactValidationSchema,
    ),
    EmergencyContactController.createEmergencyContact,
  )
  .get(isUserOrDriver, EmergencyContactController.getEmergencyContacts);

router
  .route("/:contactId")
  .patch(
    isUserOrDriver,
    validateRequest(
      EmergencyContactZodValidation.updateEmergencyContactValidationSchema,
    ),
    EmergencyContactController.updateEmergencyContact,
  )
  .delete(isUserOrDriver, EmergencyContactController.deleteEmergencyContact);

export const EmergencyContactRoutes = router;
