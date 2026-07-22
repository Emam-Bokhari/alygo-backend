"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingPaymentRoutes = void 0;
const express_1 = __importDefault(require("express"));
const pendingPayment_controller_1 = require("./pendingPayment.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
// Get all pending payments for the authenticated user
router.get(
  "/",
  authHelper_1.isAuthenticated,
  pendingPayment_controller_1.PendingPaymentController.getPendingPayments,
);
// Pay cancellation fee immediately using Stripe
router.post(
  "/:pendingPaymentId/pay-stripe",
  authHelper_1.isUser,
  pendingPayment_controller_1.PendingPaymentController
    .payCancellationFeeWithStripe,
);
// Pay cancellation fee immediately using wallet balance
router.post(
  "/:pendingPaymentId/pay-wallet",
  authHelper_1.isUser,
  pendingPayment_controller_1.PendingPaymentController
    .payCancellationFeeWithWallet,
);
// Skip/void a pending payment (for driver appreciation)
router.post(
  "/:pendingPaymentId/skip",
  authHelper_1.isUser,
  pendingPayment_controller_1.PendingPaymentController.skipPendingPayment,
);
exports.PendingPaymentRoutes = router;
