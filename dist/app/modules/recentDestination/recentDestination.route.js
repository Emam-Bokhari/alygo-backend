"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecentDestinationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const recentDestination_controller_1 = require("./recentDestination.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
// Get all recent destinations for the logged-in passenger
router.get("/", authHelper_1.isUser, recentDestination_controller_1.RecentDestinationController.getRecentDestinations);
// Delete a single recent destination (must come before the clear all route)
router.delete("/:id", authHelper_1.isUser, recentDestination_controller_1.RecentDestinationController.deleteRecentDestination);
// Clear all recent destinations for the logged-in passenger
router.delete("/clear-all", authHelper_1.isUser, recentDestination_controller_1.RecentDestinationController.clearAllRecentDestinations);
exports.RecentDestinationRoutes = router;
