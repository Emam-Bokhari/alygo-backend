import express from "express";
import { isAdmin } from "../../../helpers/authHelper";
import { CancellationAnalyticsController } from "./cancellationAnalytics.controller";
import validateRequest from "../../middlewares/validateRequest";
import { CancellationAnalyticsValidation } from "./cancellationAnalytics.validation";

const router = express.Router();

router.get(
  "/admin/analytics/cancellations/summary",
  isAdmin,
  validateRequest(CancellationAnalyticsValidation.cancellationQuerySchema),
  CancellationAnalyticsController.getSummary,
);
router.get(
  "/admin/analytics/cancellations/trend",
  isAdmin,
  validateRequest(CancellationAnalyticsValidation.cancellationQuerySchema),
  CancellationAnalyticsController.getTrend,
);
router.get(
  "/admin/analytics/cancellations/reasons",
  isAdmin,
  validateRequest(CancellationAnalyticsValidation.cancellationQuerySchema),
  CancellationAnalyticsController.getReasons,
);
router.get(
  "/admin/analytics/cancellations/cities",
  isAdmin,
  validateRequest(CancellationAnalyticsValidation.cancellationQuerySchema),
  CancellationAnalyticsController.getCities,
);
router.get(
  "/admin/analytics/cancellations/categories",
  isAdmin,
  validateRequest(CancellationAnalyticsValidation.cancellationQuerySchema),
  CancellationAnalyticsController.getCategories,
);

export const CancellationAnalyticsRoutes = router;
