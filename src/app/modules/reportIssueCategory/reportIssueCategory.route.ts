import express from "express";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { ReportIssueCategoryController } from "./reportIssueCategory.controller";

const router = express.Router();

router
  .route("/")
  .post(isAdmin, ReportIssueCategoryController.createReportIssueCategory)
  .get(isAdmin, ReportIssueCategoryController.getAllReportIssueCategories);

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
  .patch(isAdmin, ReportIssueCategoryController.updateReportIssueCategory)
  .delete(isAdmin, ReportIssueCategoryController.deleteReportIssueCategory);

router.patch(
  "/status/:categoryId",
  isAdmin,
  ReportIssueCategoryController.updateReportIssueCategoryStatus,
);

export const ReportIssueCategoryRoutes = router;
