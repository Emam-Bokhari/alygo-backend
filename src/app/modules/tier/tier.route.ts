import express from "express";
import { TierController } from "./tier.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(auth(), requirePermission("tier.create"), TierController.createTier)
  .get(isAuthenticated, TierController.getAllTiers);

router
  .route("/:tierId")
  .get(isAuthenticated, TierController.getTierById)
  .patch(auth(), requirePermission("tier.update"), TierController.updateTier)
  .delete(auth(), requirePermission("tier.delete"), TierController.deleteTier);

router.patch("/status/:tierId", auth(), requirePermission("tier.update"), TierController.updateTierStatus);

export const TierRoutes = router;
