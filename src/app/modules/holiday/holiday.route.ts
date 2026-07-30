import express from "express";
import { HolidayController } from "./holiday.controller";
import validateRequest from "../../middlewares/validateRequest";
import { HolidayZodValidation } from "./holiday.validation";
import { isAdmin } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(
    auth(),
    requirePermission("holiday.create"),
    validateRequest(HolidayZodValidation.createHolidayValidationSchema),
    HolidayController.createHoliday,
  )
  .get(
    auth(),
    requirePermission("holiday.read"),
    HolidayController.getAllHoliday,
  );

router.get(
  "/active",
  auth(),
  requirePermission("holiday.read"),
  HolidayController.getActiveHoliday,
);

router.patch(
  "/status/:holidayId",
  auth(),
  requirePermission("holiday.update"),
  validateRequest(HolidayZodValidation.updateHolidayStatusValidationSchema),
  HolidayController.updateHolidayStatus,
);

router
  .route("/:holidayId")
  .get(auth(), requirePermission("holiday.read"), HolidayController.getHoliday)
  .patch(
    auth(),
    requirePermission("holiday.update"),
    validateRequest(HolidayZodValidation.updateHolidayValidationSchema),
    HolidayController.updateHoliday,
  )
  .delete(
    auth(),
    requirePermission("holiday.delete"),
    HolidayController.deleteHoliday,
  );

export const HolidayRoutes = router;
