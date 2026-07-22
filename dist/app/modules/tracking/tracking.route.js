"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingRoutes = void 0;
const express_1 = __importDefault(require("express"));
const tracking_controller_1 = require("./tracking.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router.get("/:rideId", authHelper_1.isAuthenticated, tracking_controller_1.TrackingController.getTrackingByRideId);
router.post("/", authHelper_1.isAuthenticated, tracking_controller_1.TrackingController.createOrUpdateTracking);
exports.TrackingRoutes = router;
