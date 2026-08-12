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
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

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
router.get(
  "/admin/reports",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getAllReports,
);

// Admin overrides / updates on reports
router.patch(
  "/admin/reports/:id",
  auth(),
  requirePermission("lostandfound"),
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

adminRouter.get(
  "/:reportId/details",
  auth(),
  requirePermission("lostandfound"),
  validateRequest(LostAndFoundValidation.getReportByIdParamsSchema),
  LostAndFoundController.getLostItemDetails,
);

adminRouter.get(
  "/:reportId/return-details",
  auth(),
  requirePermission("lostandfound"),
  validateRequest(LostAndFoundValidation.getReportByIdParamsSchema),
  LostAndFoundController.getLostItemReturnDetails,
);

adminRouter.get(
  "/dashboard/cards",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getAdminDashboardCards,
);
adminRouter.get(
  "/reports",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getAdminReports,
);
adminRouter.get(
  "/returns",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getAdminReturns,
);

adminRouter.get(
  "/delivery-fee",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getDeliveryFeeSettings,
);
adminRouter.patch(
  "/delivery-fee",
  auth(),
  requirePermission("lostandfound"),
  validateRequest(LostAndFoundValidation.updateDeliveryFeeSettingsSchema),
  LostAndFoundController.updateDeliveryFeeSettings,
);

adminRouter.get(
  "/item-categories",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getAdminItemCategories,
);
adminRouter.get(
  "/driver-compensation",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getDriverCompensations,
);
adminRouter.get(
  "/disputes",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getAdminDisputes,
);

adminRouter.get(
  "/analytics/overview",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getAnalyticsOverview,
);
adminRouter.get(
  "/analytics/report-trend",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getAnalyticsReportTrend,
);
adminRouter.get(
  "/analytics/most-lost-items",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getAnalyticsMostLostItems,
);
adminRouter.get(
  "/analytics/city-reports",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getAnalyticsCityReports,
);
adminRouter.get(
  "/analytics/category-distribution",
  auth(),
  requirePermission("lostandfound"),
  LostAndFoundController.getAnalyticsCategoryDistribution,
);

export const LostAndFoundAdminRoutes = adminRouter;
