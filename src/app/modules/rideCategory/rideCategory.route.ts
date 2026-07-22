import express from "express";
import { RideCategoryController } from "./rideCategory.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import validateRequest from "../../middlewares/validateRequest";
import { RideCategoryValidation } from "./rideCategory.validation";

const router = express.Router();

router
  .route("/")
  .post(
    isAdmin,
    validateRequest(RideCategoryValidation.createRideCategoryValidationSchema),
    RideCategoryController.createRideCategory,
  )
  .get(isAdmin, RideCategoryController.getAllRideCategories);

router.get(
  "/active",
  isAuthenticated,
  RideCategoryController.getActiveRideCategories,
);

router.patch(
  "/status/:rideCategoryId",
  isAdmin,
  RideCategoryController.updateRideCategoryStatus,
);

router
  .route("/:rideCategoryId")
  .get(isAuthenticated, RideCategoryController.getRideCategory)
  .patch(
    isAdmin,
    validateRequest(RideCategoryValidation.updateRideCategoryValidationSchema),
    RideCategoryController.updateRideCategory,
  )
  .delete(isAdmin, RideCategoryController.deleteRideCategory);

export const RideCategoryRoutes = router;
