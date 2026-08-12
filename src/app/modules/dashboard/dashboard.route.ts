import express from "express";
import { DashboardController } from "./dashboard.controller";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router.get(
  "/summary",
  auth(),
  requirePermission("dashboard"),
  DashboardController.getSummary,
);
router.get(
  "/revenue-chart",
  auth(),
  requirePermission("dashboard"),
  DashboardController.getRevenueChart,
);
router.get(
  "/demand-chart",
  auth(),
  requirePermission("dashboard"),
  DashboardController.getDemandChart,
);
router.get(
  "/driver-growth",
  auth(),
  requirePermission("dashboard"),
  DashboardController.getDriverGrowth,
);
router.get(
  "/passenger-growth",
  auth(),
  requirePermission("dashboard"),
  DashboardController.getPassengerGrowth,
);
router.get(
  "/category-usage",
  auth(),
  requirePermission("dashboard"),
  DashboardController.getCategoryUsage,
);
router.get(
  "/top-cities",
  auth(),
  requirePermission("dashboard"),
  DashboardController.getTopCities,
);
router.get(
  "/top-airports",
  auth(),
  requirePermission("dashboard"),
  DashboardController.getTopAirports,
);

export const DashboardRoutes = router;
