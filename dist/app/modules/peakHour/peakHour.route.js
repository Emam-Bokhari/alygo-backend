"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeakHourRoutes = void 0;
const express_1 = __importDefault(require("express"));
const peakHour_controller_1 = require("./peakHour.controller");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const peakHour_validation_1 = require("./peakHour.validation");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router
    .route("/")
    .post(authHelper_1.isAdmin, (0, validateRequest_1.default)(peakHour_validation_1.PeakHourZodValidation.createPeakHourValidationSchema), peakHour_controller_1.PeakHourController.createPeakHour)
    .get(authHelper_1.isAdmin, peakHour_controller_1.PeakHourController.getAllPeakHour);
router.get("/active", authHelper_1.isAdmin, peakHour_controller_1.PeakHourController.getActivePeakHour);
router.patch("/status/:peakHourId", authHelper_1.isAdmin, (0, validateRequest_1.default)(peakHour_validation_1.PeakHourZodValidation.updatePeakHourStatusValidationSchema), peakHour_controller_1.PeakHourController.updatePeakHourStatus);
router
    .route("/:peakHourId")
    .get(authHelper_1.isAdmin, peakHour_controller_1.PeakHourController.getPeakHour)
    .patch(authHelper_1.isAdmin, (0, validateRequest_1.default)(peakHour_validation_1.PeakHourZodValidation.updatePeakHourValidationSchema), peakHour_controller_1.PeakHourController.updatePeakHour)
    .delete(authHelper_1.isAdmin, peakHour_controller_1.PeakHourController.deletePeakHour);
exports.PeakHourRoutes = router;
