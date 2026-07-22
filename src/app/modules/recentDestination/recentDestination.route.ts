import express from "express";
import { RecentDestinationController } from "./recentDestination.controller";
import { isAuthenticated, isUser } from "../../../helpers/authHelper";

const router = express.Router();

// Get all recent destinations for the logged-in passenger
router.get("/", isUser, RecentDestinationController.getRecentDestinations);

// Delete a single recent destination (must come before the clear all route)
router.delete(
  "/:id",
  isUser,
  RecentDestinationController.deleteRecentDestination,
);

// Clear all recent destinations for the logged-in passenger
router.delete(
  "/clear-all",
  isUser,
  RecentDestinationController.clearAllRecentDestinations,
);

export const RecentDestinationRoutes = router;
