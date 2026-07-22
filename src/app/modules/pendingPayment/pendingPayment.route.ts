import express from "express";
import { PendingPaymentController } from "./pendingPayment.controller";
import { isAuthenticated, isUser } from "../../../helpers/authHelper";

const router = express.Router();

// Get all pending payments for the authenticated user
router.get("/", isAuthenticated, PendingPaymentController.getPendingPayments);

// Pay cancellation fee immediately using Stripe
router.post(
  "/:pendingPaymentId/pay-stripe",
  isUser,
  PendingPaymentController.payCancellationFeeWithStripe,
);

// Pay cancellation fee immediately using wallet balance
router.post(
  "/:pendingPaymentId/pay-wallet",
  isUser,
  PendingPaymentController.payCancellationFeeWithWallet,
);

// Skip/void a pending payment (for driver appreciation)
router.post(
  "/:pendingPaymentId/skip",
  isUser,
  PendingPaymentController.skipPendingPayment,
);

export const PendingPaymentRoutes = router;
