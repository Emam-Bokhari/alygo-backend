import express from "express";
import { HolidayController } from "./holiday.controller";
import validateRequest from "../../middlewares/validateRequest";
import { HolidayZodValidation } from "./holiday.validation";
import { isAdmin } from "../../../helpers/authHelper";

const router = express.Router();

router
  .route("/")
  .post(
    isAdmin,
    validateRequest(HolidayZodValidation.createHolidayValidationSchema),
    HolidayController.createHoliday,
  )
  .get(isAdmin, HolidayController.getAllHoliday);

router.get("/active", isAdmin, HolidayController.getActiveHoliday);

router.patch(
  "/status/:holidayId",
  isAdmin,
  validateRequest(HolidayZodValidation.updateHolidayStatusValidationSchema),
  HolidayController.updateHolidayStatus,
);

router
  .route("/:holidayId")
  .get(isAdmin, HolidayController.getHoliday)
  .patch(
    isAdmin,
    validateRequest(HolidayZodValidation.updateHolidayValidationSchema),
    HolidayController.updateHoliday,
  )
  .delete(isAdmin, HolidayController.deleteHoliday);

export const HolidayRoutes = router;
