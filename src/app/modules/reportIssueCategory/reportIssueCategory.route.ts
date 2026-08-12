import express from "express";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { ReportIssueCategoryController } from "./reportIssueCategory.controller";
import auth from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

router
  .route("/")
  .post(
    auth(),
    requirePermission("reportissuecategory"),
    ReportIssueCategoryController.createReportIssueCategory,
  )
  .get(
    auth(),
    requirePermission("reportissuecategory"),
    ReportIssueCategoryController.getAllReportIssueCategories,
  );

router.get(
  "/active",
  isAuthenticated,
  ReportIssueCategoryController.getActiveReportIssueCategories,
);

router
  .route("/:categoryId")
  .get(
    isAuthenticated,
    ReportIssueCategoryController.getReportIssueCategoryById,
  )
  .patch(
    auth(),
    requirePermission("reportissuecategory"),
    ReportIssueCategoryController.updateReportIssueCategory,
  )
  .delete(
    auth(),
    requirePermission("reportissuecategory"),
    ReportIssueCategoryController.deleteReportIssueCategory,
  );

router.patch(
  "/status/:categoryId",
  auth(),
  requirePermission("reportissuecategory"),
  ReportIssueCategoryController.updateReportIssueCategoryStatus,
);

export const ReportIssueCategoryRoutes = router;
