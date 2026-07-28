import express from "express";
import { CancellationPolicyController } from "./cancellationPolicy.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

router.get(
  "/active",
  isAuthenticated,
  CancellationPolicyController.getActiveCancellationPolicy,
);

router.patch(
  "/",
  isAdmin,
  CancellationPolicyController.createOrUpdateCancellationPolicy,
);

export const CancellationPolicyRoutes = router;
