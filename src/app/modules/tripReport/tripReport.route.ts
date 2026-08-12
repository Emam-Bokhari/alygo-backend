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
  requirePermission("tripReport"),
  TripReportController.getAllTripReports,
);
router.get(
  "/admin/trip-reports/dashboard/cards",
  auth(),
  requirePermission("tripReport"),
  TripReportController.getDashboardCards,
);
router.get(
  "/admin/trip-reports/:reportId",
  auth(),
  requirePermission("tripReport"),
  TripReportController.getTripReportById,
);
router.patch(
  "/admin/trip-reports/:reportId",
  auth(),
  requirePermission("tripReport"),
  TripReportController.updateTripReport,
);

export const TripReportRoutes = router;

// New router instance for Trip Completion Complaints admin dashboard
const complaintRouter = express.Router();

complaintRouter.get(
  "/dashboard/cards",
  auth(),
  requirePermission("tripreport"),
  TripReportController.getDashboardCards,
);

complaintRouter.get(
  "/analytics/trend",
  auth(),
  requirePermission("tripreport"),
  TripReportController.getComplaintTrend,
);

complaintRouter.get(
  "/",
  auth(),
  requirePermission("tripreport"),
  TripReportController.getAllComplaints,
);

complaintRouter.get(
  "/:complaintId",
  auth(),
  requirePermission("tripreport"),
  TripReportController.getComplaintDetails,
);

complaintRouter.patch(
  "/status/:complaintId",
  auth(),
  requirePermission("tripreport"),
  TripReportController.updateComplaintStatus,
);

export const TripCompletionComplaintRoutes = complaintRouter;
