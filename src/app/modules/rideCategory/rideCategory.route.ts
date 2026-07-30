import express from "express";
import { RideCategoryController } from "./rideCategory.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import validateRequest from "../../middlewares/validateRequest";
import { RideCategoryValidation } from "./rideCategory.validation";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(
    auth(),
    requirePermission("ridecategory.create"),
    validateRequest(RideCategoryValidation.createRideCategoryValidationSchema),
    RideCategoryController.createRideCategory,
  )
  .get(
    auth(),
    requirePermission("ridecategory.read"),
    RideCategoryController.getAllRideCategories,
  );

router.get(
  "/active",
  isAuthenticated,
  RideCategoryController.getActiveRideCategories,
);

router.patch(
  "/status/:rideCategoryId",
  auth(),
  requirePermission("ridecategory.update"),
  RideCategoryController.updateRideCategoryStatus,
);

router
  .route("/:rideCategoryId")
  .get(isAuthenticated, RideCategoryController.getRideCategory)
  .patch(
    auth(),
    requirePermission("ridecategory.update"),
    validateRequest(RideCategoryValidation.updateRideCategoryValidationSchema),
    RideCategoryController.updateRideCategory,
  )
  .delete(
    auth(),
    requirePermission("ridecategory.delete"),
    RideCategoryController.deleteRideCategory,
  );

export const RideCategoryRoutes = router;
