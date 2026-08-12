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
    requirePermission("holiday"),
    validateRequest(HolidayZodValidation.createHolidayValidationSchema),
    HolidayController.createHoliday,
  )
  .get(auth(), requirePermission("holiday"), HolidayController.getAllHoliday);

router.get(
  "/active",
  auth(),
  requirePermission("holiday"),
  HolidayController.getActiveHoliday,
);

router.patch(
  "/status/:holidayId",
  auth(),
  requirePermission("holiday"),
  validateRequest(HolidayZodValidation.updateHolidayStatusValidationSchema),
  HolidayController.updateHolidayStatus,
);

router
  .route("/:holidayId")
  .get(auth(), requirePermission("holiday"), HolidayController.getHoliday)
  .patch(
    auth(),
    requirePermission("holiday"),
    validateRequest(HolidayZodValidation.updateHolidayValidationSchema),
    HolidayController.updateHoliday,
  )
  .delete(
    auth(),
    requirePermission("holiday"),
    HolidayController.deleteHoliday,
  );

export const HolidayRoutes = router;
