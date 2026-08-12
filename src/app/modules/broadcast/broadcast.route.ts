import express from "express";
import { BroadcastController } from "./broadcast.controller";
import validateRequest from "../../middlewares/validateRequest";
import { BroadcastValidation } from "./broadcast.validation";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";
import { isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

router
  .route("/")
  .post(
    auth(),
    requirePermission("broadcast"),
    validateRequest(BroadcastValidation.createBroadcastValidationSchema),
    BroadcastController.createBroadcast,
  )
  .get(isAuthenticated, BroadcastController.getAllBroadcasts);

router.patch(
  "/:id/cancel",
  auth(),
  requirePermission("broadcast"),
  BroadcastController.cancelBroadcast,
);

router
  .route("/:id")
  .get(isAuthenticated, BroadcastController.getSingleBroadcast)
  .delete(
    auth(),
    requirePermission("broadcast"),
    BroadcastController.deleteBroadcast,
  );

export const BroadcastRoutes = router;
