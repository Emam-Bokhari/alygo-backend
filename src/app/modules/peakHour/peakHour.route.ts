import express from "express";
import { PeakHourController } from "./peakHour.controller";
import validateRequest from "../../middlewares/validateRequest";
import { PeakHourZodValidation } from "./peakHour.validation";
import { isAdmin } from "../../../helpers/authHelper";

const router = express.Router();

router
  .route("/")
  .post(
    isAdmin,
    validateRequest(PeakHourZodValidation.createPeakHourValidationSchema),
    PeakHourController.createPeakHour,
  )
  .get(isAdmin, PeakHourController.getAllPeakHour);

router.get("/active", isAdmin, PeakHourController.getActivePeakHour);

router.patch(
  "/status/:peakHourId",
  isAdmin,
  validateRequest(PeakHourZodValidation.updatePeakHourStatusValidationSchema),
  PeakHourController.updatePeakHourStatus,
);

router
  .route("/:peakHourId")
  .get(isAdmin, PeakHourController.getPeakHour)
  .patch(
    isAdmin,
    validateRequest(PeakHourZodValidation.updatePeakHourValidationSchema),
    PeakHourController.updatePeakHour,
  )
  .delete(isAdmin, PeakHourController.deletePeakHour);

export const PeakHourRoutes = router;
