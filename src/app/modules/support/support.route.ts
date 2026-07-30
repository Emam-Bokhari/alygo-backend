import express from "express";
import { USER_ROLES } from "../../../enums/user";
import auth from "../../middlewares/auth";
import { SupportControllers } from "./support.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(isAuthenticated, SupportControllers.submitSupportRequest)
  .get(
    auth(),
    requirePermission("support.read"),
    SupportControllers.getAllSupports,
  );

router
  .route("/:id")
  .get(
    auth(),
    requirePermission("support.read"),
    SupportControllers.getSupportById,
  )
  .delete(
    auth(),
    requirePermission("support.delete"),
    SupportControllers.deleteSupportById,
  );

export const SupportRoutes = router;
