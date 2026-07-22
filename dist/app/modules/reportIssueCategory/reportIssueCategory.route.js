"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportIssueCategoryRoutes = void 0;
const express_1 = __importDefault(require("express"));
const authHelper_1 = require("../../../helpers/authHelper");
const reportIssueCategory_controller_1 = require("./reportIssueCategory.controller");
const router = express_1.default.Router();
router
  .route("/")
  .post(
    authHelper_1.isAdmin,
    reportIssueCategory_controller_1.ReportIssueCategoryController
      .createReportIssueCategory,
  )
  .get(
    authHelper_1.isAdmin,
    reportIssueCategory_controller_1.ReportIssueCategoryController
      .getAllReportIssueCategories,
  );
router.get(
  "/active",
  authHelper_1.isAuthenticated,
  reportIssueCategory_controller_1.ReportIssueCategoryController
    .getActiveReportIssueCategories,
);
router
  .route("/:categoryId")
  .get(
    authHelper_1.isAuthenticated,
    reportIssueCategory_controller_1.ReportIssueCategoryController
      .getReportIssueCategoryById,
  )
  .patch(
    authHelper_1.isAdmin,
    reportIssueCategory_controller_1.ReportIssueCategoryController
      .updateReportIssueCategory,
  )
  .delete(
    authHelper_1.isAdmin,
    reportIssueCategory_controller_1.ReportIssueCategoryController
      .deleteReportIssueCategory,
  );
router.patch(
  "/status/:categoryId",
  authHelper_1.isAdmin,
  reportIssueCategory_controller_1.ReportIssueCategoryController
    .updateReportIssueCategoryStatus,
);
exports.ReportIssueCategoryRoutes = router;
