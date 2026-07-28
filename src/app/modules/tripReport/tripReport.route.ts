import express from "express";
import { TripReportController } from "./tripReport.controller";
import { isAdmin } from "../../../helpers/authHelper";

const router = express.Router();

// Admin routes for trip reports
router.get(
  "/admin/trip-reports",
  isAdmin,
  TripReportController.getAllTripReports,
);
router.get(
  "/admin/trip-reports/dashboard/cards",
  isAdmin,
  TripReportController.getDashboardCards,
);
router.get(
  "/admin/trip-reports/:reportId",
  isAdmin,
  TripReportController.getTripReportById,
);
router.patch(
  "/admin/trip-reports/:reportId",
  isAdmin,
  TripReportController.updateTripReport,
);

export const TripReportRoutes = router;

// New router instance for Trip Completion Complaints admin dashboard
const complaintRouter = express.Router();

complaintRouter.get(
  "/dashboard/cards",
  isAdmin,
  TripReportController.getDashboardCards,
);

complaintRouter.get(
  "/analytics/trend",
  isAdmin,
  TripReportController.getComplaintTrend,
);

complaintRouter.get(
  "/",
  isAdmin,
  TripReportController.getAllComplaints,
);

complaintRouter.get(
  "/:complaintId",
  isAdmin, 
  TripReportController.getComplaintDetails,
);

complaintRouter.patch(
  "/status/:complaintId",
  isAdmin,
  TripReportController.updateComplaintStatus,
);

export const TripCompletionComplaintRoutes = complaintRouter;
