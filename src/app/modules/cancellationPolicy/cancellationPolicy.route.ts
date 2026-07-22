import express from "express";
import { CancellationPolicyController } from "./cancellationPolicy.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

router
  .route("/")
  .post(isAdmin, CancellationPolicyController.createCancellationPolicy)
  .get(isAdmin, CancellationPolicyController.getAllCancellationPolicy);

router.get(
  "/active",
  isAuthenticated,
  CancellationPolicyController.getActiveCancellationPolicies,
);

router.get(
  "/actor/:actorType/trigger/:triggerType",
  isAuthenticated,
  CancellationPolicyController.getCancellationPolicyByActorAndTrigger,
);

router.patch(
  "/status/:cancellationPolicyId",
  isAdmin,
  CancellationPolicyController.updateCancellationPolicyStatus,
);

router
  .route("/:cancellationPolicyId")
  .get(isAuthenticated, CancellationPolicyController.getCancellationPolicy)
  .patch(isAdmin, CancellationPolicyController.updateCancellationPolicy)
  .delete(isAdmin, CancellationPolicyController.deleteCancellationPolicy);

export const CancellationPolicyRoutes = router;
