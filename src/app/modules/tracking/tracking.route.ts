import express from "express";
import { TrackingController } from "./tracking.controller";
import { isAuthenticated, isDriver } from "../../../helpers/authHelper";

const router = express.Router();

router.get("/:rideId", isAuthenticated, TrackingController.getTrackingByRideId);

router.post("/", isAuthenticated, TrackingController.createOrUpdateTracking);

export const TrackingRoutes = router;
