import express from "express";
import { LostAndFoundItemCategoryController } from "./lostAndFoundItemCategory.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(
    auth(),
    requirePermission("lostandfounditemcategory"),
    LostAndFoundItemCategoryController.createLostAndFoundItemCategory,
  )
  .get(
    auth(),
    requirePermission("lostandfounditemcategory"),
    LostAndFoundItemCategoryController.getAllLostAndFoundItemCategories,
  );

router.get(
  "/active",
  isAuthenticated,
  LostAndFoundItemCategoryController.getActiveLostAndFoundItemCategories,
);

router.patch(
  "/status/:lostAndFoundItemCategoryId",
  auth(),
  requirePermission("lostandfounditemcategory"),
  LostAndFoundItemCategoryController.updateLostAndFoundItemCategoryStatus,
);

router
  .route("/:lostAndFoundItemCategoryId")
  .get(
    isAuthenticated,
    LostAndFoundItemCategoryController.getLostAndFoundItemCategory,
  )
  .patch(
    auth(),
    requirePermission("lostandfounditemcategory"),
    LostAndFoundItemCategoryController.updateLostAndFoundItemCategory,
  )
  .delete(
    auth(),
    requirePermission("lostandfounditemcategory"),
    LostAndFoundItemCategoryController.deleteLostAndFoundItemCategory,
  );

export const LostAndFoundItemCategoryRoutes = router;
