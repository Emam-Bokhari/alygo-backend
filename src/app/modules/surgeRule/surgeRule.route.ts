import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { SurgeRuleController } from "./surgeRule.controller";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import { requirePermission } from "../../middlewares/requirePermission";

const router = express.Router();

// get active surge rules (must come before /:surgeRuleId)
router
  .route("/active")
  .get(isAuthenticated, SurgeRuleController.getActiveSurgeRules);

// admin routes
router
  .route("/")
  .post(
    auth(),
    requirePermission("surgerule.create"),
    SurgeRuleController.createSurgeRule,
  )
  .get(isAuthenticated, SurgeRuleController.getAllSurgeRules);

router
  .route("/:surgeRuleId")
  .get(isAuthenticated, SurgeRuleController.getSurgeRuleById)
  .patch(
    auth(),
    requirePermission("surgerule.update"),
    SurgeRuleController.updateSurgeRule,
  )
  .delete(
    auth(),
    requirePermission("surgerule.delete"),
    SurgeRuleController.deleteSurgeRule,
  );

// update surge rule status
router
  .route("/status/:surgeRuleId")
  .patch(
    auth(),
    requirePermission("surgerule.update"),
    SurgeRuleController.updateSurgeRuleStatus,
  );

// test surge calculation
router
  .route("/test/:serviceAreaId")
  .get(isAuthenticated, SurgeRuleController.testSurgeCalculation);

export const SurgeRuleRoutes = router;
