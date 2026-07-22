"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationReasonRoutes = void 0;
const express_1 = __importDefault(require("express"));
const authHelper_1 = require("../../../helpers/authHelper");
const cancellationReason_controller_1 = require("./cancellationReason.controller");
const router = express_1.default.Router();
router
    .route("/")
    .post(authHelper_1.isAdmin, cancellationReason_controller_1.CancellationReasonController.createCancellationReason)
    .get(authHelper_1.isAdmin, cancellationReason_controller_1.CancellationReasonController.getAllCancellationReasons);
router.get("/active", authHelper_1.isAuthenticated, cancellationReason_controller_1.CancellationReasonController.getActiveCancellationReasons);
router
    .route("/:cancellationReasonId")
    .get(authHelper_1.isAuthenticated, cancellationReason_controller_1.CancellationReasonController.getCancellationReason)
    .patch(authHelper_1.isAdmin, cancellationReason_controller_1.CancellationReasonController.updateCancellationReason)
    .delete(authHelper_1.isAdmin, cancellationReason_controller_1.CancellationReasonController.deleteCancellationReason);
router.patch("/status/:cancellationReasonId", authHelper_1.isAdmin, cancellationReason_controller_1.CancellationReasonController.updateCancellationReasonStatus);
exports.CancellationReasonRoutes = router;
