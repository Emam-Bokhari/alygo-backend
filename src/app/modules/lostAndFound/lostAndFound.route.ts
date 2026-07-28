import express from "express";
import { LostAndFoundController } from "./lostAndFound.controller";
import { LostAndFoundValidation } from "./lostAndFound.validation";
import validateRequest from "../../middlewares/validateRequest";
import {
  isUser,
  isDriver,
  isAdmin,
  isAuthenticated,
} from "../../../helpers/authHelper";
import fileUploadHandler from "../../middlewares/flieUploadHandler";
import { parseFileData } from "../../middlewares/parseFileData";

const router = express.Router();

// ----------------------------------------------------
// Passenger Routes
// ----------------------------------------------------

// Report a lost item
router.post(
  "/",
  isUser,
  fileUploadHandler(["uploadedFiles"]),
  parseFileData("uploadedFiles"),
  validateRequest(LostAndFoundValidation.reportLostItemSchema),
  LostAndFoundController.reportLostItem,
);

// View passenger's reported items
router.get("/my", isUser, LostAndFoundController.getMyReports);

// Track lost item report status/timeline
router.get("/:id/track", isUser, LostAndFoundController.trackReportStatus);

// Confirm item receipt
router.patch(
  "/:id/confirm",
  isUser,
  LostAndFoundController.confirmItemReceived,
);

// Rate the return / driver
router.post(
  "/:id/rating",
  isUser,
  validateRequest(LostAndFoundValidation.rateDriverSchema),
  LostAndFoundController.submitDriverRating,
);

// Create checkout session for return delivery fee
router.post("/:id/pay", isUser, LostAndFoundController.createPaymentSession);

// ----------------------------------------------------
// Driver Routes
// ----------------------------------------------------

// View lost item requests assigned to the driver
router.get("/driver", isDriver, LostAndFoundController.getDriverReports);

// Mark item as found
router.patch(
  "/:id/found",
  isDriver,
  validateRequest(LostAndFoundValidation.driverFoundSchema),
  LostAndFoundController.markFound,
);

// Mark item as not found
router.patch(
  "/:id/not-found",
  isDriver,
  validateRequest(LostAndFoundValidation.driverNotFoundSchema),
  LostAndFoundController.markNotFound,
);

// Configure return details (Pickup/Delivery, Fee, Address, Schedule)
router.patch(
  "/:id/recovery",
  isDriver,
  validateRequest(LostAndFoundValidation.configureRecoverySchema),
  LostAndFoundController.configureRecovery,
);

// Mark item return completed (handover finished)
router.patch("/:id/returned", isDriver, LostAndFoundController.markReturned);

// ----------------------------------------------------
// Admin Routes
// ----------------------------------------------------

// Retrieve all reports in the system
router.get("/admin/reports", isAdmin, LostAndFoundController.getAllReports);

// Admin overrides / updates on reports
router.patch(
  "/admin/reports/:id",
  isAdmin,
  validateRequest(LostAndFoundValidation.adminUpdateSchema),
  LostAndFoundController.adminUpdateReport,
);

// ----------------------------------------------------
// Shared Details Route
// ----------------------------------------------------

// Retrieve specific report details (accessible to passenger, driver, or admin)
router.get("/:id", isAuthenticated, LostAndFoundController.getReportDetails);

export const LostAndFoundRoutes = router;

// New router instance for Admin Lost & Found module
const adminRouter = express.Router();

adminRouter.get("/dashboard/cards", isAdmin, LostAndFoundController.getAdminDashboardCards);
adminRouter.get("/reports", isAdmin, LostAndFoundController.getAdminReports);
adminRouter.get("/returns", isAdmin, LostAndFoundController.getAdminReturns);

adminRouter.get("/delivery-fee", isAdmin, LostAndFoundController.getDeliveryFeeSettings);
adminRouter.patch(
  "/delivery-fee",
  isAdmin,
  validateRequest(LostAndFoundValidation.updateDeliveryFeeSettingsSchema),
  LostAndFoundController.updateDeliveryFeeSettings
);

adminRouter.get("/item-categories", isAdmin, LostAndFoundController.getAdminItemCategories);
adminRouter.get("/driver-compensation", isAdmin, LostAndFoundController.getDriverCompensations);
adminRouter.get("/disputes", isAdmin, LostAndFoundController.getAdminDisputes);

adminRouter.get("/analytics/overview", isAdmin, LostAndFoundController.getAnalyticsOverview);
adminRouter.get("/analytics/report-trend", isAdmin, LostAndFoundController.getAnalyticsReportTrend);
adminRouter.get("/analytics/most-lost-items", isAdmin, LostAndFoundController.getAnalyticsMostLostItems);
adminRouter.get("/analytics/city-reports", isAdmin, LostAndFoundController.getAnalyticsCityReports);
adminRouter.get("/analytics/category-distribution", isAdmin, LostAndFoundController.getAnalyticsCategoryDistribution);

export const LostAndFoundAdminRoutes = adminRouter;

