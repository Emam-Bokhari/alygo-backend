import express from "express";
import { BannerController } from "./banner.controller";
import validateRequest from "../../middlewares/validateRequest";
import { BannerZodValidation } from "./banner.validation";
import { parseFileData } from "../../middlewares/parseFileData";
import fileUploadHandler from "../../middlewares/flieUploadHandler";
import { requirePermission } from "../../middlewares/requirePermission";
import auth from "../../middlewares/auth";

const router = express.Router();

router
  .route("/")
  .post(
    // isAdmin,
    auth(),
    requirePermission("banner"),
    fileUploadHandler(),
    parseFileData({
      fieldName: "image",
      mode: "single",
    }),
    validateRequest(BannerZodValidation.createBannerValidationSchema),
    BannerController.createBanner,
  )
  .get(BannerController.getBannersFromDB);

router.patch(
  "/status/:id",
  // isAdmin,
  auth(),
  requirePermission("banner"),
  BannerController.updateBannerStatus,
);

router
  .route("/:id")
  .patch(
    // isAdmin,
    auth(),
    requirePermission("banner"),
    fileUploadHandler(),
    parseFileData({ fieldName: "image", mode: "single" }),
    BannerController.updateBanner,
  )
  .delete(
    // isAdmin,
    auth(),
    requirePermission("banner"),
    BannerController.deleteBanner,
  );

router.get(
  "/all",
  auth(),
  requirePermission("banner"),
  BannerController.getAllBanner,
);

export const BannerRoutes = router;
