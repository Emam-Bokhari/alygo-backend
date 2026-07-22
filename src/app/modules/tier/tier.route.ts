import express from "express";
import { TierController } from "./tier.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

router
  .route("/")
  .post(isAdmin, TierController.createTier)
  .get(isAuthenticated, TierController.getAllTiers);

router
  .route("/:tierId")
  .get(isAuthenticated, TierController.getTierById)
  .patch(isAdmin, TierController.updateTier)
  .delete(isAdmin, TierController.deleteTier);

router.patch("/status/:tierId", isAdmin, TierController.updateTierStatus);

export const TierRoutes = router;
