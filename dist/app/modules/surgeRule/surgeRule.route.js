"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurgeRuleRoutes = void 0;
const express_1 = __importDefault(require("express"));
const surgeRule_controller_1 = require("./surgeRule.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
// get active surge rules (must come before /:surgeRuleId)
router
  .route("/active")
  .get(
    authHelper_1.isAuthenticated,
    surgeRule_controller_1.SurgeRuleController.getActiveSurgeRules,
  );
// admin routes
router
  .route("/")
  .post(
    authHelper_1.isAdmin,
    surgeRule_controller_1.SurgeRuleController.createSurgeRule,
  )
  .get(
    authHelper_1.isAuthenticated,
    surgeRule_controller_1.SurgeRuleController.getAllSurgeRules,
  );
router
  .route("/:surgeRuleId")
  .get(
    authHelper_1.isAuthenticated,
    surgeRule_controller_1.SurgeRuleController.getSurgeRuleById,
  )
  .patch(
    authHelper_1.isAdmin,
    surgeRule_controller_1.SurgeRuleController.updateSurgeRule,
  )
  .delete(
    authHelper_1.isAdmin,
    surgeRule_controller_1.SurgeRuleController.deleteSurgeRule,
  );
// update surge rule status
router
  .route("/status/:surgeRuleId")
  .patch(
    authHelper_1.isAdmin,
    surgeRule_controller_1.SurgeRuleController.updateSurgeRuleStatus,
  );
// test surge calculation
router
  .route("/test/:serviceAreaId")
  .get(
    authHelper_1.isAuthenticated,
    surgeRule_controller_1.SurgeRuleController.testSurgeCalculation,
  );
exports.SurgeRuleRoutes = router;
