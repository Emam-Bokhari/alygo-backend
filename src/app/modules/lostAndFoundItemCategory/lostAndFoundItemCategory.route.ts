import express from "express";
import { LostAndFoundItemCategoryController } from "./lostAndFoundItemCategory.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

router
  .route("/")
  .post(
    isAdmin,
    LostAndFoundItemCategoryController.createLostAndFoundItemCategory,
  )
  .get(
    isAdmin,
    LostAndFoundItemCategoryController.getAllLostAndFoundItemCategories,
  );

router.get(
  "/active",
  isAuthenticated,
  LostAndFoundItemCategoryController.getActiveLostAndFoundItemCategories,
);

router.patch(
  "/status/:lostAndFoundItemCategoryId",
  isAdmin,
  LostAndFoundItemCategoryController.updateLostAndFoundItemCategoryStatus,
);

router
  .route("/:lostAndFoundItemCategoryId")
  .get(
    isAuthenticated,
    LostAndFoundItemCategoryController.getLostAndFoundItemCategory,
  )
  .patch(
    isAdmin,
    LostAndFoundItemCategoryController.updateLostAndFoundItemCategory,
  )
  .delete(
    isAdmin,
    LostAndFoundItemCategoryController.deleteLostAndFoundItemCategory,
  );

export const LostAndFoundItemCategoryRoutes = router;
