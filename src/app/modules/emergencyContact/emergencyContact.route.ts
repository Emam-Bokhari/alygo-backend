import express from "express";
import { EmergencyContactController } from "./emergencyContact.controller";
import validateRequest from "../../middlewares/validateRequest";
import { EmergencyContactZodValidation } from "./emergencyContact.validation";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";

const isUserOrDriver = auth(USER_ROLES.USER, USER_ROLES.DRIVER);

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
