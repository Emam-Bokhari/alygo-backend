import express from "express";
import { isAdmin } from "../../../helpers/authHelper";
import { LiveTripsController } from "./liveTrips.controller";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";
import validateRequest from "../../middlewares/validateRequest";
import { LiveTripsValidation } from "./liveTrips.validation";

const router = express.Router();

router.get(
  "/",
  auth(),
  requirePermission("livetrips.read"),
  LiveTripsController.getLiveTrips,
);

router.get(
  "/:rideId",
  auth(),
  requirePermission("livetrips.read"),
  validateRequest(LiveTripsValidation.getLiveTripByIdZodSchema),
  LiveTripsController.getLiveTripById,
);

export const LiveTripsRoutes = router;
