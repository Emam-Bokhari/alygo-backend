"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewRoutes = void 0;
const express_1 = __importDefault(require("express"));
const review_controller_1 = require("./review.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
// Create review (user or driver)
router.post("/:rideId", authHelper_1.isAuthenticated, review_controller_1.ReviewController.createReview);
exports.ReviewRoutes = router;
