import express from "express";
import { USER_ROLES } from "../../../enums/user";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ComplianceCenterController } from "./complianceCenter.controller";
import { ComplianceCenterValidation } from "./complianceCenter.validation";
import { isAdmin } from "../../../helpers/authHelper";

const router = express.Router();

// ==========================================
// 1. BACKGROUND CHECK FEES CRUD
// ==========================================

router.post(
  "/fees",
  isAdmin,
  validateRequest(ComplianceCenterValidation.createBackgroundCheckFeeZodSchema),
  ComplianceCenterController.createBackgroundCheckFee,
);

router.get(
  "/fees",
  isAdmin,
  ComplianceCenterController.getAllBackgroundCheckFees,
);

router.patch(
  "/fees/status/:id",
  isAdmin,
  validateRequest(ComplianceCenterValidation.updateFeeStatusZodSchema),
  ComplianceCenterController.updateFeeStatus,
);

router.get(
  "/fees/:id",
  isAdmin,
  ComplianceCenterController.getSingleBackgroundCheckFee,
);

router.patch(
  "/fees/:id",
  isAdmin,
  validateRequest(ComplianceCenterValidation.updateBackgroundCheckFeeZodSchema),
  ComplianceCenterController.updateBackgroundCheckFee,
);

router.delete(
  "/fees/:id",
  isAdmin,
  ComplianceCenterController.deleteBackgroundCheckFee,
);

// ==========================================
// 2. DOCUMENT MONITORING
// ==========================================

router.get(
  "/document-monitoring",
  isAdmin,
  validateRequest(ComplianceCenterValidation.documentMonitoringQueryZodSchema),
  ComplianceCenterController.getDocumentMonitoring,
);

export const ComplianceCenterRoutes = router;
