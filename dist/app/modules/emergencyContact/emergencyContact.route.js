"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyContactRoutes = void 0;
const express_1 = __importDefault(require("express"));
const emergencyContact_controller_1 = require("./emergencyContact.controller");
const validateRequest_1 = __importDefault(
  require("../../middlewares/validateRequest"),
);
const emergencyContact_validation_1 = require("./emergencyContact.validation");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const isUserOrDriver = (0, auth_1.default)(
  user_1.USER_ROLES.USER,
  user_1.USER_ROLES.DRIVER,
);
const router = express_1.default.Router();
router
  .route("/")
  .post(
    isUserOrDriver,
    (0, validateRequest_1.default)(
      emergencyContact_validation_1.EmergencyContactZodValidation
        .createEmergencyContactValidationSchema,
    ),
    emergencyContact_controller_1.EmergencyContactController
      .createEmergencyContact,
  )
  .get(
    isUserOrDriver,
    emergencyContact_controller_1.EmergencyContactController
      .getEmergencyContacts,
  );
router
  .route("/:contactId")
  .patch(
    isUserOrDriver,
    (0, validateRequest_1.default)(
      emergencyContact_validation_1.EmergencyContactZodValidation
        .updateEmergencyContactValidationSchema,
    ),
    emergencyContact_controller_1.EmergencyContactController
      .updateEmergencyContact,
  )
  .delete(
    isUserOrDriver,
    emergencyContact_controller_1.EmergencyContactController
      .deleteEmergencyContact,
  );
exports.EmergencyContactRoutes = router;
