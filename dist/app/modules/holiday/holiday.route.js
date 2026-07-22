"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.HolidayRoutes = void 0;
const express_1 = __importDefault(require("express"));
const holiday_controller_1 = require("./holiday.controller");
const validateRequest_1 = __importDefault(
  require("../../middlewares/validateRequest"),
);
const holiday_validation_1 = require("./holiday.validation");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router
  .route("/")
  .post(
    authHelper_1.isAdmin,
    (0, validateRequest_1.default)(
      holiday_validation_1.HolidayZodValidation.createHolidayValidationSchema,
    ),
    holiday_controller_1.HolidayController.createHoliday,
  )
  .get(
    authHelper_1.isAdmin,
    holiday_controller_1.HolidayController.getAllHoliday,
  );
router.get(
  "/active",
  authHelper_1.isAdmin,
  holiday_controller_1.HolidayController.getActiveHoliday,
);
router.patch(
  "/status/:holidayId",
  authHelper_1.isAdmin,
  (0, validateRequest_1.default)(
    holiday_validation_1.HolidayZodValidation
      .updateHolidayStatusValidationSchema,
  ),
  holiday_controller_1.HolidayController.updateHolidayStatus,
);
router
  .route("/:holidayId")
  .get(authHelper_1.isAdmin, holiday_controller_1.HolidayController.getHoliday)
  .patch(
    authHelper_1.isAdmin,
    (0, validateRequest_1.default)(
      holiday_validation_1.HolidayZodValidation.updateHolidayValidationSchema,
    ),
    holiday_controller_1.HolidayController.updateHoliday,
  )
  .delete(
    authHelper_1.isAdmin,
    holiday_controller_1.HolidayController.deleteHoliday,
  );
exports.HolidayRoutes = router;
