import express from "express";
import { isAdmin } from "../../../helpers/authHelper";
import { LiveTripsController } from "./liveTrips.controller";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router.get("/", auth(),requirePermission("livetrips.read"), LiveTripsController.getLiveTrips);

export const LiveTripsRoutes = router;
