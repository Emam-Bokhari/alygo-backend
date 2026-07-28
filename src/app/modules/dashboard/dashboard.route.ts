import express from "express";
import { isAdmin } from "../../../helpers/authHelper";
import { DashboardController } from "./dashboard.controller";

const router = express.Router();

router.get("/summary", isAdmin, DashboardController.getSummary);
router.get("/revenue-chart", isAdmin, DashboardController.getRevenueChart);
router.get("/demand-chart", isAdmin, DashboardController.getDemandChart);
router.get("/driver-growth", isAdmin, DashboardController.getDriverGrowth);
router.get(
  "/passenger-growth",
  isAdmin,
  DashboardController.getPassengerGrowth,
);
router.get("/category-usage", isAdmin, DashboardController.getCategoryUsage);
router.get("/top-cities", isAdmin, DashboardController.getTopCities);
router.get("/top-airports", isAdmin, DashboardController.getTopAirports);

export const DashboardRoutes = router;
