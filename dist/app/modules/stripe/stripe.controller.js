"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeControllers = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const user_model_1 = require("../user/user.model");
const driver_model_1 = require("../driver/driver.model");
const ride_model_1 = require("../ride/ride.model");
const transaction_model_1 = require("../transaction/transaction.model");
const stripe_service_1 = __importDefault(require("./stripe.service"));
const stripe_1 = __importDefault(require("../../../config/stripe"));
const config_1 = __importDefault(require("../../../config"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const ride_service_1 = require("../ride/ride.service");
const wallet_service_1 = require("../wallet/wallet.service");
const transaction_service_1 = require("../transaction/transaction.service");
const ride_constant_1 = require("../ride/ride.constant");
const transaction_constant_1 = require("../transaction/transaction.constant");
const mongoose_1 = __importDefault(require("mongoose"));
const handleStripeWebhook_1 = require("../../../helpers/webhooks/handleStripeWebhook");
// ----------------------------------------------------
// Stripe Connected Account for Drivers (Onboarding)
// ----------------------------------------------------
const createStripeAccount = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const stripeAccount = yield stripe_service_1.default.createConnectedAccount(
      user.email,
      user.id,
    );
    // Update Driver's Stripe account ID
    yield driver_model_1.Driver.findOneAndUpdate(
      { userId: user.id },
      { stripeConnectedAccountId: stripeAccount.id },
    );
    yield user_model_1.User.findByIdAndUpdate(user.id, {
      stripeConnectedAccountId: stripeAccount.id,
    });
    const returnUrl = `${config_1.default.stripe.BASE_URL || "http://10.10.7.41:5005"}/stripe/onboarding/success`;
    const refreshUrl = `${config_1.default.stripe.BASE_URL || "http://10.10.7.41:5005"}/stripe/onboarding/refresh`;
    const onboardingLink = yield stripe_service_1.default.createAccountLink(
      stripeAccount.id,
      returnUrl,
      refreshUrl,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message: "Stripe account created successfully",
      data: { link: onboardingLink },
    });
  }),
);
const getStripeDashboardLink = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    // Retrieve driver profile
    const driver = yield mongoose_1.default
      .model("Driver")
      .findOne({ userId: user.id });
    const connectedAccountId =
      (driver === null || driver === void 0
        ? void 0
        : driver.stripeConnectedAccountId) || user.stripeConnectedAccountId;
    if (!connectedAccountId) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Stripe account not connected",
      );
    }
    const dashboardLink =
      yield stripe_service_1.default.createLoginLink(connectedAccountId);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message: "Stripe Dashboard link generated",
      data: { url: dashboardLink },
    });
  }),
);
const getAccountDetails = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const driver = yield mongoose_1.default
      .model("Driver")
      .findOne({ userId: user.id });
    const connectedAccountId =
      (driver === null || driver === void 0
        ? void 0
        : driver.stripeConnectedAccountId) || user.stripeConnectedAccountId;
    if (!connectedAccountId) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Stripe account not connected",
      );
    }
    const account =
      yield stripe_service_1.default.retrieveAccount(connectedAccountId);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message: "Stripe account details retrieved",
      data: {
        accountId: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
      },
    });
  }),
);
// ----------------------------------------------------
// Passenger Payments
// ----------------------------------------------------
const createCheckoutSession = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { rideId, useWallet } = req.body;
    const ride = yield ride_model_1.Ride.findOne({ _id: rideId, userId });
    if (!ride) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "Ride not found or unauthorized.",
      );
    }
    if (ride.status !== ride_constant_1.RIDE_STATUS.COMPLETED) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Ride must be completed before payment.",
      );
    }
    if (ride.payment.status === ride_constant_1.PAYMENT_STATUS.PAID) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "This ride is already paid.",
      );
    }
    const totalFare = ride.fare.total;
    let walletDeduction = 0;
    let chargeAmount = totalFare;
    if (useWallet) {
      const wallet =
        yield wallet_service_1.WalletService.getOrCreateWallet(userId);
      walletDeduction = Math.min(wallet.balance, totalFare);
      chargeAmount = totalFare - walletDeduction;
    }
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "Passenger user profile not found.",
      );
    }
    // Handle wallet-only payment direct completion internally
    if (chargeAmount === 0) {
      const result = yield ride_service_1.RideServices.completeRidePayment(
        rideId,
        ride_constant_1.PAYMENT_METHOD.WALLET,
      );
      return (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Ride payment completed successfully using wallet balance.",
        data: {
          checkoutUrl: null,
          sessionId: null,
          totalFare,
          walletDeduction,
          chargeAmount,
          paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
          result,
        },
      });
    }
    const stripeCustomerId = yield stripe_service_1.default.getOrCreateCustomer(
      userId,
      user.email,
      user.name,
    );
    // Success and cancel URLs pointing to frontend pages
    const successUrl = `${config_1.default.client_url || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}&rideId=${rideId}`;
    const cancelUrl = `${config_1.default.client_url || "http://localhost:3000"}/payment/cancel?session_id={CHECKOUT_SESSION_ID}&rideId=${rideId}`;
    const session = yield stripe_service_1.default.createCheckoutSession(
      chargeAmount,
      config_1.default.stripe.currency || "usd",
      {
        type: "ride_payment",
        rideId: ride._id.toString(),
        userId,
        useWallet: useWallet ? "true" : "false",
        walletAmount: walletDeduction.toString(),
        amount: chargeAmount.toString(),
        currency: config_1.default.stripe.currency || "usd",
      },
      stripeCustomerId,
      successUrl,
      cancelUrl,
    );
    // Save Stripe Checkout Session and Payment Intent details to Ride
    ride.payment.stripeCheckoutSessionId = session.id;
    if (session.payment_intent) {
      ride.payment.stripePaymentIntentId = session.payment_intent;
    }
    yield ride.save();
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Stripe Checkout Session created successfully",
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
        totalFare,
        walletDeduction,
        chargeAmount,
      },
    });
  }),
);
const getPaymentStatus = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { id: paymentIntentId } = req.params;
    const paymentIntent =
      yield stripe_service_1.default.retrievePaymentIntent(paymentIntentId);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Payment intent status retrieved",
      data: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      },
    });
  }),
);
// ----------------------------------------------------
// Refunds
// ----------------------------------------------------
const refundTransaction = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { transactionId, amount } = req.body;
    const transaction = yield transaction_model_1.Transaction.findOne({
      $or: [{ transactionId }, { gatewayTransactionId: transactionId }],
    });
    if (!transaction) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "Transaction not found.",
      );
    }
    if (transaction.paymentStatus === ride_constant_1.PAYMENT_STATUS.REFUNDED) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Transaction is already refunded.",
      );
    }
    const refundAmount = amount ? Number(amount) : transaction.amount;
    let refundId = "";
    if (
      transaction.paymentMethod !== ride_constant_1.PAYMENT_METHOD.WALLET &&
      transaction.gatewayTransactionId
    ) {
      const stripeRefund = yield stripe_service_1.default.refundPayment(
        transaction.gatewayTransactionId,
        refundAmount,
      );
      refundId = stripeRefund.id;
    } else {
      // Refund to Wallet
      const wallet = yield wallet_service_1.WalletService.getOrCreateWallet(
        transaction.userId,
      );
      wallet.balance = parseFloat((wallet.balance + refundAmount).toFixed(2));
      yield wallet.save();
    }
    // Mark original transaction as Refunded
    transaction.paymentStatus = ride_constant_1.PAYMENT_STATUS.REFUNDED;
    yield transaction.save();
    // Create Refund Transaction
    const refundTxn =
      yield transaction_service_1.TransactionService.createTransaction({
        userId: transaction.userId,
        driverId: transaction.driverId,
        bookingId: transaction.bookingId,
        rideId: transaction.rideId,
        amount: refundAmount,
        paymentMethod: transaction.paymentMethod,
        paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
        transactionType: transaction_constant_1.TRANSACTION_TYPE.REFUND,
        stripeRefundId: refundId,
        gatewayTransactionId: refundId || undefined,
        description: `Refund for original transaction ${transaction.transactionId}`,
      });
    // If associated with a ride, update the ride status
    if (transaction.bookingId) {
      yield ride_model_1.Ride.findByIdAndUpdate(transaction.bookingId, {
        "payment.status": ride_constant_1.PAYMENT_STATUS.REFUNDED,
      });
    }
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Refund processed successfully",
      data: refundTxn,
    });
  }),
);
// ----------------------------------------------------
// Stripe Webhook Event Handler
// ----------------------------------------------------
const handleWebhook = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res
        .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
        .send("Missing Stripe signature header");
    }
    let event;
    try {
      event = stripe_1.default.webhooks.constructEvent(
        req.rawBody,
        signature,
        config_1.default.stripe.webhookSecret,
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res
        .status(http_status_codes_1.StatusCodes.BAD_REQUEST)
        .send(`Webhook Error: ${err.message}`);
    }
    try {
      yield (0, handleStripeWebhook_1.handleStripeWebhook)(event);
      res.status(http_status_codes_1.StatusCodes.OK).json({ received: true });
    } catch (error) {
      console.error(
        `Error processing Stripe Webhook (${event.type}):`,
        error.message || error,
      );
      res
        .status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR)
        .send(`Webhook processing error: ${error.message}`);
    }
  });
exports.StripeControllers = {
  createStripeAccount,
  getStripeDashboardLink,
  getAccountDetails,
  createCheckoutSession,
  getPaymentStatus,
  refundTransaction,
  handleWebhook,
};
