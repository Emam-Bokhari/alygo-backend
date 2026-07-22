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
