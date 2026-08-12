import express from "express";
import { AnalyticsController } from "./analytics.controller";
import validateRequest from "../../middlewares/validateRequest";
import { AnalyticsValidation } from "./analytics.validation";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router.get(
  "/overview",
  auth(),
  requirePermission("analytics"),
  validateRequest(AnalyticsValidation.analyticsQuerySchema),
  AnalyticsController.getOverview,
);

router.get(
  "/drivers",
  auth(),
  requirePermission("analytics"),
  validateRequest(AnalyticsValidation.analyticsQuerySchema),
  AnalyticsController.getDriverGrowth,
);

router.get(
  "/passengers",
  auth(),
  requirePermission("analytics"),
  validateRequest(AnalyticsValidation.analyticsQuerySchema),
  AnalyticsController.getPassengerGrowth,
);

router.get(
  "/revenue",
  auth(),
  requirePermission("analytics"),
  validateRequest(AnalyticsValidation.analyticsQuerySchema),
  AnalyticsController.getRevenueTrend,
);

router.get(
  "/demand",
  auth(),
  requirePermission("analytics"),
  validateRequest(AnalyticsValidation.analyticsQuerySchema),
  AnalyticsController.getDemandByHour,
);

router.get(
  "/export-csv",
  auth(),
  requirePermission("analytics"),
  validateRequest(AnalyticsValidation.analyticsQuerySchema),
  AnalyticsController.exportCsv,
);

export const AnalyticsRoutes = router;
