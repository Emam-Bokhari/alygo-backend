"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripCompletionComplaintRoutes = exports.TripReportRoutes = void 0;
const express_1 = __importDefault(require("express"));
const tripReport_controller_1 = require("./tripReport.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
// Admin routes for trip reports
router.get("/admin/trip-reports", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.getAllTripReports);
router.get("/admin/trip-reports/dashboard/cards", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.getDashboardCards);
router.get("/admin/trip-reports/:reportId", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.getTripReportById);
router.patch("/admin/trip-reports/:reportId", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.updateTripReport);
exports.TripReportRoutes = router;
// New router instance for Trip Completion Complaints admin dashboard
const complaintRouter = express_1.default.Router();
complaintRouter.get("/dashboard/cards", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.getDashboardCards);
complaintRouter.get("/analytics/trend", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.getComplaintTrend);
complaintRouter.get("/", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.getAllComplaints);
complaintRouter.get("/:complaintId", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.getComplaintDetails);
complaintRouter.patch("/status/:complaintId", authHelper_1.isAdmin, tripReport_controller_1.TripReportController.updateComplaintStatus);
exports.TripCompletionComplaintRoutes = complaintRouter;
