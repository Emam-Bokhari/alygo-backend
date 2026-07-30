import express from "express";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { CancellationReasonController } from "./cancellationReason.controller";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(auth(), requirePermission("cancellationreason.create"), CancellationReasonController.createCancellationReason)
  .get(auth(), requirePermission("cancellationreason.read"), CancellationReasonController.getAllCancellationReasons);

router.get(
  "/active",
  isAuthenticated,
  CancellationReasonController.getActiveCancellationReasons,
);

router
  .route("/:cancellationReasonId")
  .get(isAuthenticated, CancellationReasonController.getCancellationReason)
  .patch(auth(), requirePermission("cancellationreason.update"), CancellationReasonController.updateCancellationReason)
  .delete(auth(), requirePermission("cancellationreason.delete"), CancellationReasonController.deleteCancellationReason);

router.patch(
  "/status/:cancellationReasonId",
  auth(),
  requirePermission("cancellationreason.update"),
  CancellationReasonController.updateCancellationReasonStatus,
);

export const CancellationReasonRoutes = router;
