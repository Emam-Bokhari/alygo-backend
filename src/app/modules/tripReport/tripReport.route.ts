import express from "express";
import { TripReportController } from "./tripReport.controller";
import { isAdmin } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

// Admin routes for trip reports
router.get(
  "/admin/trip-reports",
  auth(),
  requirePermission("tripReport.read"),
  TripReportController.getAllTripReports,
);
router.get(
  "/admin/trip-reports/dashboard/cards",
  auth(),
  requirePermission("tripReport.read"),
  TripReportController.getDashboardCards,
);
router.get(
  "/admin/trip-reports/:reportId",
  auth(),
  requirePermission("tripReport.read"),
  TripReportController.getTripReportById,
);
router.patch(
  "/admin/trip-reports/:reportId",
  auth(),
  requirePermission("tripReport.update"),
  TripReportController.updateTripReport,
);

export const TripReportRoutes = router;

// New router instance for Trip Completion Complaints admin dashboard
const complaintRouter = express.Router();

complaintRouter.get(
  "/dashboard/cards",
  auth(),
  requirePermission("tripreport.read"),
  TripReportController.getDashboardCards,
);

complaintRouter.get(
  "/analytics/trend",
  auth(),
  requirePermission("tripreport.read"),
  TripReportController.getComplaintTrend,
);

complaintRouter.get(
  "/", 
  auth(),
  requirePermission("tripreport.read"),
  TripReportController.getAllComplaints
);

complaintRouter.get(
  "/:complaintId",
  auth(),
  requirePermission("tripreport.read"),
  TripReportController.getComplaintDetails,
);

complaintRouter.patch(
  "/status/:complaintId",
  auth(),
  requirePermission("tripreport.update"),
  TripReportController.updateComplaintStatus,
);

export const TripCompletionComplaintRoutes = complaintRouter;
