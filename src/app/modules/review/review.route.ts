import express from "express";
import { ReviewController } from "./review.controller";
import { isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

// Create review (user or driver)
router.post("/:rideId", isAuthenticated, ReviewController.createReview);

export const ReviewRoutes = router;
