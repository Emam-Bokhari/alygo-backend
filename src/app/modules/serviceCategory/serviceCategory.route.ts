import express from "express";
import { ServiceCategoryController } from "./serviceCategory.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { parseFileData } from "../../middlewares/parseFileData";
import fileUploadHandler from "../../middlewares/flieUploadHandler";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(
    auth(),
    requirePermission("servicecategory"),
    fileUploadHandler(),
    parseFileData({
      fieldName: "image",
      mode: "single",
    }),
    ServiceCategoryController.createServiceCategory,
  )
  .get(
    auth(),
    requirePermission("servicecategory"),
    ServiceCategoryController.getAllServiceCategory,
  );

router.get(
  "/active",
  isAuthenticated,
  ServiceCategoryController.getActiveServiceCategories,
);

router.patch(
  "/status/:serviceCategoryId",
  auth(),
  requirePermission("servicecategory"),
  ServiceCategoryController.updateServiceCategoryStatus,
);

router
  .route("/:serviceCategoryId")
  .get(
    auth(),
    requirePermission("servicecategory"),
    ServiceCategoryController.getServiceCategory,
  )
  .patch(
    auth(),
    requirePermission("servicecategory"),
    fileUploadHandler(),
    parseFileData({ fieldName: "image", mode: "single" }),
    ServiceCategoryController.updateServiceCategory,
  )
  .delete(
    auth(),
    requirePermission("servicecategory"),
    ServiceCategoryController.deleteServiceCategory,
  );

export const ServiceCategoryRoutes = router;
