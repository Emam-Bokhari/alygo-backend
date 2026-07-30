import express from "express";
import { DashboardController } from "./dashboard.controller";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router.get("/summary", auth(), requirePermission("dashboard.read"), DashboardController.getSummary);
router.get("/revenue-chart", auth(), requirePermission("dashboard.read"), DashboardController.getRevenueChart);
router.get("/demand-chart", auth(), requirePermission("dashboard.read"), DashboardController.getDemandChart);
router.get("/driver-growth", auth(), requirePermission("dashboard.read"), DashboardController.getDriverGrowth);
router.get(
  "/passenger-growth",
  auth(),
  requirePermission("dashboard.read"),
  DashboardController.getPassengerGrowth,
);
router.get("/category-usage", auth(), requirePermission("dashboard.read"), DashboardController.getCategoryUsage);
router.get("/top-cities", auth(), requirePermission("dashboard.read"), DashboardController.getTopCities);
router.get("/top-airports", auth(), requirePermission("dashboard.read"), DashboardController.getTopAirports);

export const DashboardRoutes = router;
