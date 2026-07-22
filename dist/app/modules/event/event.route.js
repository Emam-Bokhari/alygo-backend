"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRoutes = void 0;
const express_1 = __importDefault(require("express"));
const event_controller_1 = require("./event.controller");
const validateRequest_1 = __importDefault(
  require("../../middlewares/validateRequest"),
);
const event_validation_1 = require("./event.validation");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router
  .route("/")
  .post(
    authHelper_1.isAdmin,
    (0, validateRequest_1.default)(
      event_validation_1.EventZodValidation.createEventValidationSchema,
    ),
    event_controller_1.EventController.createEvent,
  )
  .get(authHelper_1.isAdmin, event_controller_1.EventController.getAllEvent);
router.get(
  "/active",
  authHelper_1.isAdmin,
  event_controller_1.EventController.getActiveEvent,
);
router.patch(
  "/status/:eventId",
  authHelper_1.isAdmin,
  (0, validateRequest_1.default)(
    event_validation_1.EventZodValidation.updateEventStatusValidationSchema,
  ),
  event_controller_1.EventController.updateEventStatus,
);
router
  .route("/:eventId")
  .get(authHelper_1.isAdmin, event_controller_1.EventController.getEvent)
  .patch(
    authHelper_1.isAdmin,
    (0, validateRequest_1.default)(
      event_validation_1.EventZodValidation.updateEventValidationSchema,
    ),
    event_controller_1.EventController.updateEvent,
  )
  .delete(authHelper_1.isAdmin, event_controller_1.EventController.deleteEvent);
exports.EventRoutes = router;
