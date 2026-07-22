import express from "express";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { CancellationReasonController } from "./cancellationReason.controller";

const router = express.Router();

router
  .route("/")
  .post(isAdmin, CancellationReasonController.createCancellationReason)
  .get(isAdmin, CancellationReasonController.getAllCancellationReasons);

router.get(
  "/active",
  isAuthenticated,
  CancellationReasonController.getActiveCancellationReasons,
);

router
  .route("/:cancellationReasonId")
  .get(isAuthenticated, CancellationReasonController.getCancellationReason)
  .patch(isAdmin, CancellationReasonController.updateCancellationReason)
  .delete(isAdmin, CancellationReasonController.deleteCancellationReason);

router.patch(
  "/status/:cancellationReasonId",
  isAdmin,
  CancellationReasonController.updateCancellationReasonStatus,
);

export const CancellationReasonRoutes = router;
