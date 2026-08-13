import express from "express";
import auth from "../../middlewares/auth";
import { SupportControllers } from "./support.controller";
import { isAuthenticated } from "../../../helpers/authHelper";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(isAuthenticated, SupportControllers.submitSupportRequest)
  .get(auth(), requirePermission("support"), SupportControllers.getAllSupports);

router
  .route("/:id")
  .get(auth(), requirePermission("support"), SupportControllers.getSupportById)
  .delete(
    auth(),
    requirePermission("support"),
    SupportControllers.deleteSupportById,
  );

export const SupportRoutes = router;