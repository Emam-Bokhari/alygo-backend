"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripReportRoutes = void 0;
const express_1 = __importDefault(require("express"));
const tripReport_controller_1 = require("./tripReport.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
// Admin routes for trip reports
router.get("/admin/trip-reports", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.getAllTripReports);
router.get("/admin/trip-reports/:reportId", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.getTripReportById);
router.patch("/admin/trip-reports/:reportId", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.updateTripReport);
exports.TripReportRoutes = router;
