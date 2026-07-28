import express from "express";
import { isAdmin } from "../../../helpers/authHelper";
import { LiveTripsController } from "./liveTrips.controller";

const router = express.Router();

router.get("/", isAdmin, LiveTripsController.getLiveTrips);

export const LiveTripsRoutes = router;
