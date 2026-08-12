import express from "express";
import { CancellationPolicyController } from "./cancellationPolicy.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router.get(
  "/active",
  isAuthenticated,
  CancellationPolicyController.getActiveCancellationPolicy,
);

router.patch(
  "/",
  auth(),
  requirePermission("cancellationpolicy"),
  CancellationPolicyController.createOrUpdateCancellationPolicy,
);

export const CancellationPolicyRoutes = router;
