import express from "express";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { CancellationReasonController } from "./cancellationReason.controller";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(
    auth(),
    requirePermission("cancellationreason"),
    CancellationReasonController.createCancellationReason,
  )
  .get(
    auth(),
    requirePermission("cancellationreason"),
    CancellationReasonController.getAllCancellationReasons,
  );

router.get(
  "/active",
  isAuthenticated,
  CancellationReasonController.getActiveCancellationReasons,
);

router
  .route("/:cancellationReasonId")
  .get(isAuthenticated, CancellationReasonController.getCancellationReason)
  .patch(
    auth(),
    requirePermission("cancellationreason"),
    CancellationReasonController.updateCancellationReason,
  )
  .delete(
    auth(),
    requirePermission("cancellationreason"),
    CancellationReasonController.deleteCancellationReason,
  );

router.patch(
  "/status/:cancellationReasonId",
  auth(),
  requirePermission("cancellationreason"),
  CancellationReasonController.updateCancellationReasonStatus,
);

export const CancellationReasonRoutes = router;
