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
    requirePermission("reportissuecategory.create"),
    ReportIssueCategoryController.createReportIssueCategory,
  )
  .get(
    auth(),
    requirePermission("reportissuecategory.read"),
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
    requirePermission("reportissuecategory.update"),
    ReportIssueCategoryController.updateReportIssueCategory,
  )
  .delete(
    auth(),
    requirePermission("reportissuecategory.delete"),
    ReportIssueCategoryController.deleteReportIssueCategory,
  );

router.patch(
  "/status/:categoryId",
  auth(),
  requirePermission("reportissuecategory.update"),
  ReportIssueCategoryController.updateReportIssueCategoryStatus,
);

export const ReportIssueCategoryRoutes = router;
