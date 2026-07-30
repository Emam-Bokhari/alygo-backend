import express from "express";
import { BannerController } from "./banner.controller";

import validateRequest from "../../middlewares/validateRequest";

import { BannerZodValidation } from "./banner.validation";

import { isAdmin } from "../../../helpers/authHelper";
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
    requirePermission("banner.create"),
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
  requirePermission("banner.update"),
  BannerController.updateBannerStatus,
);

router
  .route("/:id")
  .patch(
    // isAdmin,
    auth(),
    requirePermission("banner.update"),
    fileUploadHandler(),
    parseFileData({ fieldName: "image", mode: "single" }),
    BannerController.updateBanner,
  )
  .delete(
    // isAdmin,
    auth(),
    requirePermission("banner.delete"),
    BannerController.deleteBanner,
  );

router.get(
  "/all",
  auth(),
  requirePermission("banner.read"),
  BannerController.getAllBanner,
);

export const BannerRoutes = router;
