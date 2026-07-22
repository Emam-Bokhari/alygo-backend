import express from "express";
import { USER_ROLES } from "../../../enums/user";
import { StripeControllers } from "./stripe.controller";
import auth from "../../middlewares/auth";
import {
  isAdmin,
  isAuthenticated,
  isDriver,
  isUser,
} from "../../../helpers/authHelper";

const router = express.Router();

// Driver onboarding / express dashboard links
router.post(
  "/connect-account",
  isDriver,
  StripeControllers.createStripeAccount,
);

router.get(
  "/dashboard",
  isAuthenticated,
  StripeControllers.getStripeDashboardLink,
);

// only use for testing purpose
router.get(
  "/account-details",
  isAuthenticated,
  StripeControllers.getAccountDetails,
);

// Payment lifecycle
router.post(
  "/create-checkout-session",
  isUser,
  StripeControllers.createCheckoutSession,
);

router.get(
  "/payment-status/:id",
  isAuthenticated,
  StripeControllers.getPaymentStatus,
);

// Refund (Admins only)
router.post("/refund", isAdmin, StripeControllers.refundTransaction);

// Stripe Webhook Endpoint (No Auth, verified cryptographically inside controller)
router.post("/webhook", StripeControllers.handleWebhook);

export const StripeRoutes = router;
