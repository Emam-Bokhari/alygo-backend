import express from "express";
import { isAdmin } from "../../../helpers/authHelper";
import { CancellationAnalyticsController } from "./cancellationAnalytics.controller";
import validateRequest from "../../middlewares/validateRequest";
import { CancellationAnalyticsValidation } from "./cancellationAnalytics.validation";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router.get(
  "/admin/analytics/cancellations/summary",
  auth(),
  requirePermission("cancellationanalytics"),
  validateRequest(CancellationAnalyticsValidation.cancellationQuerySchema),
  CancellationAnalyticsController.getSummary,
);
router.get(
  "/admin/analytics/cancellations/trend",
  auth(),
  requirePermission("cancellationanalytics"),
  validateRequest(CancellationAnalyticsValidation.cancellationQuerySchema),
  CancellationAnalyticsController.getTrend,
);
router.get(
  "/admin/analytics/cancellations/reasons",
  auth(),
  requirePermission("cancellationanalytics"),
  validateRequest(CancellationAnalyticsValidation.cancellationQuerySchema),
  CancellationAnalyticsController.getReasons,
);
router.get(
  "/admin/analytics/cancellations/cities",
  auth(),
  requirePermission("cancellationanalytics"),
  validateRequest(CancellationAnalyticsValidation.cancellationQuerySchema),
  CancellationAnalyticsController.getCities,
);
router.get(
  "/admin/analytics/cancellations/categories",
  auth(),
  requirePermission("cancellationanalytics"),
  validateRequest(CancellationAnalyticsValidation.cancellationQuerySchema),
  CancellationAnalyticsController.getCategories,
);

export const CancellationAnalyticsRoutes = router;
