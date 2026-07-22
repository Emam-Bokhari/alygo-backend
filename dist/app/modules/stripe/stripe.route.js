"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const stripe_controller_1 = require("./stripe.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
// Driver onboarding / express dashboard links
router.post("/connect-account", authHelper_1.isDriver, stripe_controller_1.StripeControllers.createStripeAccount);
router.get("/dashboard", authHelper_1.isAuthenticated, stripe_controller_1.StripeControllers.getStripeDashboardLink);
// only use for testing purpose
router.get("/account-details", authHelper_1.isAuthenticated, stripe_controller_1.StripeControllers.getAccountDetails);
// Payment lifecycle
router.post("/create-checkout-session", authHelper_1.isUser, stripe_controller_1.StripeControllers.createCheckoutSession);
router.get("/payment-status/:id", authHelper_1.isAuthenticated, stripe_controller_1.StripeControllers.getPaymentStatus);
// Refund (Admins only)
router.post("/refund", authHelper_1.isAdmin, stripe_controller_1.StripeControllers.refundTransaction);
// Stripe Webhook Endpoint (No Auth, verified cryptographically inside controller)
router.post("/webhook", stripe_controller_1.StripeControllers.handleWebhook);
exports.StripeRoutes = router;
