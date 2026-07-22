"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleRoutes = void 0;
const express_1 = require("express");
const rule_controller_1 = require("./rule.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = (0, express_1.Router)();
router.post(
  "/",
  authHelper_1.isAdmin,
  rule_controller_1.RuleControllers.upsertRule,
);
router.get("/:type", rule_controller_1.RuleControllers.getRule);
router.patch(
  "/:type",
  authHelper_1.isAdmin,
  rule_controller_1.RuleControllers.updateRule,
);
router.delete(
  "/:type",
  authHelper_1.isAdmin,
  rule_controller_1.RuleControllers.deleteRule,
);
exports.RuleRoutes = router;
