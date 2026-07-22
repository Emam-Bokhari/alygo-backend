import express from "express";
import { ServiceCategoryController } from "./serviceCategory.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { parseFileData } from "../../middlewares/parseFileData";
import fileUploadHandler from "../../middlewares/flieUploadHandler";

const router = express.Router();

router
  .route("/")
  .post(
    isAdmin,
    fileUploadHandler(),
    parseFileData({
      fieldName: "image",
      mode: "single",
    }),
    ServiceCategoryController.createServiceCategory,
  )
  .get(isAdmin, ServiceCategoryController.getAllServiceCategory);

router.get(
  "/active",
  isAuthenticated,
  ServiceCategoryController.getActiveServiceCategories,
);

router.patch(
  "/status/:serviceCategoryId",
  isAdmin,
  ServiceCategoryController.updateServiceCategoryStatus,
);

router
  .route("/:serviceCategoryId")
  .get(isAuthenticated, ServiceCategoryController.getServiceCategory)
  .patch(
    isAdmin,
    fileUploadHandler(),
    parseFileData({ fieldName: "image", mode: "single" }),
    ServiceCategoryController.updateServiceCategory,
  )
  .delete(isAdmin, ServiceCategoryController.deleteServiceCategory);

export const ServiceCategoryRoutes = router;
