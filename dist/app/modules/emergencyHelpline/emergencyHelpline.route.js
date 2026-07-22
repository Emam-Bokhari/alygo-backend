"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyHelplineRoutes = void 0;
const express_1 = __importDefault(require("express"));
const emergencyHelpline_controller_1 = require("./emergencyHelpline.controller");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const emergencyHelpline_validation_1 = require("./emergencyHelpline.validation");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router
    .route("/")
    .patch(authHelper_1.isAdmin, (0, validateRequest_1.default)(emergencyHelpline_validation_1.EmergencyHelplineZodValidation.updateEmergencyHelplineValidationSchema), emergencyHelpline_controller_1.EmergencyHelplineController.upsertEmergencyHelpline)
    .get(emergencyHelpline_controller_1.EmergencyHelplineController.getEmergencyHelpline);
exports.EmergencyHelplineRoutes = router;
