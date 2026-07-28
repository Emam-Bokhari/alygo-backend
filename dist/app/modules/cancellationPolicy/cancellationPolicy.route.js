"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationPolicyRoutes = void 0;
const express_1 = __importDefault(require("express"));
const cancellationPolicy_controller_1 = require("./cancellationPolicy.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router.get("/active", authHelper_1.isAuthenticated, cancellationPolicy_controller_1.CancellationPolicyController.getActiveCancellationPolicy);
router.patch("/", authHelper_1.isAdmin, cancellationPolicy_controller_1.CancellationPolicyController.createOrUpdateCancellationPolicy);
exports.CancellationPolicyRoutes = router;
