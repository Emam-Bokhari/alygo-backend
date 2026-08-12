import express from "express";
import { PeakHourController } from "./peakHour.controller";
import validateRequest from "../../middlewares/validateRequest";
import { PeakHourZodValidation } from "./peakHour.validation";
import { isAdmin } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(
    auth(),
    requirePermission("peakhour"),
    validateRequest(PeakHourZodValidation.createPeakHourValidationSchema),
    PeakHourController.createPeakHour,
  )
  .get(
    auth(),
    requirePermission("peakhour"),
    PeakHourController.getAllPeakHour,
  );

router.get(
  "/active",
  auth(),
  requirePermission("peakhour"),
  PeakHourController.getActivePeakHour,
);

router.patch(
  "/status/:peakHourId",
  auth(),
  requirePermission("peakhour"),
  validateRequest(PeakHourZodValidation.updatePeakHourStatusValidationSchema),
  PeakHourController.updatePeakHourStatus,
);

router
  .route("/:peakHourId")
  .get(
    auth(),
    requirePermission("peakhour"),
    PeakHourController.getPeakHour,
  )
  .patch(
    auth(),
    requirePermission("peakhour"),
    validateRequest(PeakHourZodValidation.updatePeakHourValidationSchema),
    PeakHourController.updatePeakHour,
  )
  .delete(
    auth(),
    requirePermission("peakhour"),
    PeakHourController.deletePeakHour,
  );

export const PeakHourRoutes = router;
