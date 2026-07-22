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
exports.PendingPaymentService = void 0;
const pendingPayment_model_1 = require("./pendingPayment.model");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const ride_model_1 = require("../ride/ride.model");
const transaction_service_1 = require("../transaction/transaction.service");
const ride_constant_1 = require("../ride/ride.constant");
const wallet_model_1 = require("../wallet/wallet.model");
const wallet_service_1 = require("../wallet/wallet.service");
const user_model_1 = require("../user/user.model");
const driver_model_1 = require("../driver/driver.model");
const transaction_constant_1 = require("../transaction/transaction.constant");
const mongoose_1 = __importDefault(require("mongoose"));
const stripe_service_1 = __importDefault(require("../stripe/stripe.service"));
const config_1 = __importDefault(require("../../../config"));
/**
 * Get all pending payments for a user
 */
const getPendingPaymentsByUser = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const pendingPayments = yield pendingPayment_model_1.PendingPayment.find({
      userId,
      status: "pending",
    }).populate("rideId");
    return pendingPayments;
  });
/**
 * Pay cancellation fee immediately using Stripe Checkout
 */
const payCancellationFeeNow = (userId, pendingPaymentId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const pendingPayment =
      yield pendingPayment_model_1.PendingPayment.findById(pendingPaymentId);
    if (!pendingPayment) {
      throw new ApiErrors_1.default(404, "Pending payment not found");
    }
    if (pendingPayment.userId.toString() !== userId) {
      throw new ApiErrors_1.default(
        403,
        "You do not have permission to pay this fee",
      );
    }
    if (pendingPayment.status === "paid") {
      throw new ApiErrors_1.default(409, "Payment already completed.");
    }
    if (pendingPayment.status === "voided") {
      throw new ApiErrors_1.default(400, "Pending payment has been cancelled.");
    }
    if (pendingPayment.status !== "pending") {
      throw new ApiErrors_1.default(400, "Pending payment has expired.");
    }
    // Handle existing active checkout session
    if (pendingPayment.stripeSessionId) {
      try {
        const existingSession = yield stripe_service_1.default.retrieveSession(
          pendingPayment.stripeSessionId,
        );
        const amountCents = Math.round(pendingPayment.amount * 100);
        const isExpired =
          new Date(existingSession.expires_at * 1000) <= new Date();
        if (
          existingSession.status === "open" &&
          existingSession.payment_status === "unpaid" &&
          !isExpired &&
          existingSession.amount_total === amountCents
        ) {
          // Reuse the existing active session
          return {
            checkoutUrl: existingSession.url,
            sessionId: existingSession.id,
            expiresAt: new Date(
              existingSession.expires_at * 1000,
            ).toISOString(),
          };
        } else {
          // Expire the session if it's open but does not meet requirements
          if (existingSession.status === "open") {
            yield stripe_service_1.default.expireSession(
              pendingPayment.stripeSessionId,
            );
          }
        }
      } catch (err) {
        console.error(
          "Error checking or expiring existing stripe session:",
          err,
        );
      }
    }
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
      throw new ApiErrors_1.default(404, "User not found");
    }
    // Get or create Stripe customer
    const stripeCustomerId = yield stripe_service_1.default.getOrCreateCustomer(
      userId,
      user.email,
      user.name,
    );
    // Success and cancel URLs
    const successUrl = `${config_1.default.client_url || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=${pendingPayment.type}&pendingPaymentId=${pendingPaymentId}`;
    const cancelUrl = `${config_1.default.client_url || "http://localhost:3000"}/payment/cancel?session_id={CHECKOUT_SESSION_ID}&type=${pendingPayment.type}&pendingPaymentId=${pendingPaymentId}`;
    // Fetch ride to get cancellation reason
    let cancellationReasonId = "";
    if (pendingPayment.type === "cancellation_fee") {
      const ride = yield ride_model_1.Ride.findById(pendingPayment.rideId);
      cancellationReasonId =
        ((_b =
          (_a =
            ride === null || ride === void 0 ? void 0 : ride.cancellation) ===
            null || _a === void 0
            ? void 0
            : _a.cancellationReasonId) === null || _b === void 0
          ? void 0
          : _b.toString()) || "";
    }
    const metadata = {
      type: pendingPayment.type,
      pendingPaymentId: pendingPaymentId,
      rideId: pendingPayment.rideId.toString(),
      userId: userId,
      amount: pendingPayment.amount.toString(),
      currency: config_1.default.stripe.currency || "usd",
    };
    if (pendingPayment.type === "cancellation_fee" && cancellationReasonId) {
      metadata.cancellationReasonId = cancellationReasonId;
    } else if (
      pendingPayment.type === "driver_appreciation" &&
      pendingPayment.driverId
    ) {
      metadata.driverId = pendingPayment.driverId.toString();
    }
    // Create Stripe Checkout Session
    const session = yield stripe_service_1.default.createCheckoutSession(
      pendingPayment.amount,
      config_1.default.stripe.currency || "usd",
      metadata,
      stripeCustomerId,
      successUrl,
      cancelUrl,
    );
    // Save session details to the pending payment
    pendingPayment.stripeSessionId = session.id;
    pendingPayment.checkoutSessionExpiresAt = new Date(
      session.expires_at * 1000,
    );
    pendingPayment.paymentAttemptCount =
      (pendingPayment.paymentAttemptCount || 0) + 1;
    yield pendingPayment.save();
    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
    };
  });
/**
 * Process successful cancellation fee payment (webhook handler)
 */
const processCancellationFeePayment = (sessionId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
      // Find pending payment by session ID from metadata
      const stripeSession =
        yield stripe_service_1.default.retrieveSession(sessionId);
      const pendingPaymentId =
        (_a = stripeSession.metadata) === null || _a === void 0
          ? void 0
          : _a.pendingPaymentId;
      if (!pendingPaymentId) {
        yield session.abortTransaction();
        session.endSession();
        return;
      }
      const pendingPayment =
        yield pendingPayment_model_1.PendingPayment.findById(
          pendingPaymentId,
        ).session(session);
      if (!pendingPayment) {
        yield session.abortTransaction();
        session.endSession();
        return;
      }
      if (pendingPayment.status !== "pending") {
        yield session.abortTransaction();
        session.endSession();
        return;
      }
      // Get ride to find driver for compensation
      const ride = yield ride_model_1.Ride.findById(
        pendingPayment.rideId,
      ).session(session);
      // Update pending payment status
      pendingPayment.status = "paid";
      yield pendingPayment.save({ session });
      // Create transaction record for the cancellation fee payment
      yield transaction_service_1.TransactionService.createTransaction(
        {
          userId: pendingPayment.userId,
          rideId: pendingPayment.rideId,
          transactionType:
            transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_FEE,
          amount: pendingPayment.amount,
          paymentMethod: ride_constant_1.PAYMENT_METHOD.STRIPE,
          paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
          stripeCheckoutSessionId: sessionId,
          stripePaymentIntentId: stripeSession.payment_intent,
          description: `Cancellation fee payment of ${pendingPayment.amount} via Stripe.`,
        },
        session,
      );
      // Credit driver compensation if applicable
      const driverCompensation =
        pendingPayment.driverCompensation !== undefined
          ? pendingPayment.driverCompensation
          : ((_b =
              ride === null || ride === void 0 ? void 0 : ride.cancellation) ===
              null || _b === void 0
              ? void 0
              : _b.driverCompensation) || 0;
      if (ride && ride.driverId && driverCompensation > 0) {
        yield wallet_service_1.WalletService.addBalance(
          ride.driverId.toString(),
          driverCompensation,
          `Cancellation compensation for ride ${pendingPayment.rideId}`,
          session,
        );
      }
      // Update ride cancellation payment status
      if (ride && ride.cancellation) {
        ride.cancellation.paymentStatus = "paid";
        ride.cancellation.paymentCollectionMode = "immediate";
        yield ride.save({ session });
      }
      yield session.commitTransaction();
      session.endSession();
    } catch (error) {
      yield session.abortTransaction();
      session.endSession();
      throw error;
    }
  });
/**
 * Pay cancellation fee or driver appreciation using wallet balance
 */
const payCancellationFeeWithWallet = (userId, pendingPaymentId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
      const pendingPayment =
        yield pendingPayment_model_1.PendingPayment.findById(
          pendingPaymentId,
        ).session(session);
      if (!pendingPayment) {
        throw new ApiErrors_1.default(404, "Pending payment not found");
      }
      if (pendingPayment.userId.toString() !== userId) {
        throw new ApiErrors_1.default(
          403,
          "You do not have permission to pay this fee",
        );
      }
      if (pendingPayment.status !== "pending") {
        throw new ApiErrors_1.default(
          400,
          "This payment has already been processed",
        );
      }
      // Check wallet balance
      const wallet = yield wallet_model_1.Wallet.findOne({ userId }).session(
        session,
      );
      if (!wallet) {
        throw new ApiErrors_1.default(404, "Wallet not found");
      }
      if (wallet.balance < pendingPayment.amount) {
        throw new ApiErrors_1.default(400, "Insufficient wallet balance");
      }
      const isAppreciation = pendingPayment.type === "driver_appreciation";
      // Deduct from wallet
      yield wallet_service_1.WalletService.deductBalance(
        userId,
        pendingPayment.amount,
        isAppreciation
          ? `Driver appreciation tip for ride ${pendingPayment.rideId}`
          : `Cancellation fee payment for ride ${pendingPayment.rideId}`,
        session,
      );
      // Update pending payment status
      pendingPayment.status = "paid";
      yield pendingPayment.save({ session });
      // Create transaction record
      yield transaction_service_1.TransactionService.createTransaction(
        {
          userId: pendingPayment.userId,
          rideId: pendingPayment.rideId,
          transactionType: isAppreciation
            ? transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION
            : transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_FEE,
          amount: pendingPayment.amount,
          paymentMethod: ride_constant_1.PAYMENT_METHOD.WALLET,
          paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
          description: isAppreciation
            ? `Driver appreciation tip of ${pendingPayment.amount} via wallet.`
            : `Cancellation fee payment of ${pendingPayment.amount} via wallet.`,
        },
        session,
      );
      if (isAppreciation) {
        // Credit driver wallet and update stats
        if (pendingPayment.driverId) {
          const driver = yield driver_model_1.Driver.findById(
            pendingPayment.driverId,
          ).session(session);
          if (driver) {
            yield wallet_service_1.WalletService.addBalance(
              driver.userId.toString(),
              pendingPayment.amount,
              `Driver appreciation tip for ride ${pendingPayment.rideId}`,
              session,
              transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
            );
            // Update driver stats incrementally
            const totalReceived = driver.totalAppreciationReceived || 0;
            const totalAmount = driver.totalAppreciationAmount || 0;
            const newTotalReceived = totalReceived + 1;
            const newTotalAmount = totalAmount + pendingPayment.amount;
            driver.totalAppreciationReceived = newTotalReceived;
            driver.totalAppreciationAmount = Number(newTotalAmount.toFixed(2));
            driver.averageAppreciation = Number(
              (newTotalAmount / newTotalReceived).toFixed(2),
            );
            yield driver.save({ session });
          }
        }
      } else {
        // Get ride to find driver for compensation (cancellation fee)
        const ride = yield ride_model_1.Ride.findById(
          pendingPayment.rideId,
        ).session(session);
        // Credit driver compensation if applicable
        const walletDriverCompensation =
          pendingPayment.driverCompensation !== undefined
            ? pendingPayment.driverCompensation
            : ((_a =
                ride === null || ride === void 0
                  ? void 0
                  : ride.cancellation) === null || _a === void 0
                ? void 0
                : _a.driverCompensation) || 0;
        if (ride && ride.driverId && walletDriverCompensation > 0) {
          yield wallet_service_1.WalletService.addBalance(
            ride.driverId.toString(),
            walletDriverCompensation,
            `Cancellation compensation for ride ${pendingPayment.rideId}`,
            session,
          );
        }
        // Update ride cancellation payment status
        if (ride && ride.cancellation) {
          ride.cancellation.paymentStatus = "paid";
          ride.cancellation.paymentCollectionMode = "immediate";
          yield ride.save({ session });
        }
      }
      yield session.commitTransaction();
      session.endSession();
      return pendingPayment;
    } catch (error) {
      yield session.abortTransaction();
      session.endSession();
      throw error;
    }
  });
/**
 * Process successful driver appreciation payment (webhook handler)
 */
const processDriverAppreciationPayment = (sessionId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
      const stripeSession =
        yield stripe_service_1.default.retrieveSession(sessionId);
      const pendingPaymentId =
        (_a = stripeSession.metadata) === null || _a === void 0
          ? void 0
          : _a.pendingPaymentId;
      if (!pendingPaymentId) {
        yield session.abortTransaction();
        session.endSession();
        return;
      }
      const pendingPayment =
        yield pendingPayment_model_1.PendingPayment.findById(
          pendingPaymentId,
        ).session(session);
      if (!pendingPayment) {
        yield session.abortTransaction();
        session.endSession();
        return;
      }
      if (pendingPayment.status !== "pending") {
        yield session.abortTransaction();
        session.endSession();
        return;
      }
      // Update pending payment status
      pendingPayment.status = "paid";
      yield pendingPayment.save({ session });
      // Create transaction record
      yield transaction_service_1.TransactionService.createTransaction(
        {
          userId: pendingPayment.userId,
          rideId: pendingPayment.rideId,
          transactionType:
            transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
          amount: pendingPayment.amount,
          paymentMethod: ride_constant_1.PAYMENT_METHOD.STRIPE,
          paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
          stripeCheckoutSessionId: sessionId,
          stripePaymentIntentId: stripeSession.payment_intent,
          description: `Driver appreciation payment of ${pendingPayment.amount} via Stripe.`,
        },
        session,
      );
      // Credit driver wallet and update appreciation statistics
      if (pendingPayment.driverId) {
        const driver = yield driver_model_1.Driver.findById(
          pendingPayment.driverId,
        ).session(session);
        if (driver) {
          // Driver userId is the User document ID
          yield wallet_service_1.WalletService.addBalance(
            driver.userId.toString(),
            pendingPayment.amount,
            `Driver appreciation tip for ride ${pendingPayment.rideId}`,
            session,
            transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
          );
          // Update driver stats incrementally
          const totalReceived = driver.totalAppreciationReceived || 0;
          const totalAmount = driver.totalAppreciationAmount || 0;
          const newTotalReceived = totalReceived + 1;
          const newTotalAmount = totalAmount + pendingPayment.amount;
          driver.totalAppreciationReceived = newTotalReceived;
          driver.totalAppreciationAmount = Number(newTotalAmount.toFixed(2));
          driver.averageAppreciation = Number(
            (newTotalAmount / newTotalReceived).toFixed(2),
          );
          yield driver.save({ session });
        }
      }
      yield session.commitTransaction();
      session.endSession();
    } catch (error) {
      yield session.abortTransaction();
      session.endSession();
      throw error;
    }
  });
/**
 * Skip/void a pending payment (for driver appreciation)
 */
const skipPendingPayment = (userId, pendingPaymentId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const pendingPayment =
      yield pendingPayment_model_1.PendingPayment.findById(pendingPaymentId);
    if (!pendingPayment) {
      throw new ApiErrors_1.default(404, "Pending payment not found");
    }
    if (pendingPayment.userId.toString() !== userId) {
      throw new ApiErrors_1.default(
        403,
        "You do not have permission to skip this payment",
      );
    }
    if (pendingPayment.status !== "pending") {
      throw new ApiErrors_1.default(
        400,
        "This payment has already been processed",
      );
    }
    // Only allow skipping driver appreciation payments
    if (pendingPayment.type !== "driver_appreciation") {
      throw new ApiErrors_1.default(
        400,
        "Only driver appreciation payments can be skipped",
      );
    }
    // Update pending payment status to voided
    pendingPayment.status = "voided";
    yield pendingPayment.save();
    return pendingPayment;
  });
exports.PendingPaymentService = {
  getPendingPaymentsByUser,
  payCancellationFeeNow,
  processCancellationFeePayment,
  payCancellationFeeWithWallet,
  processDriverAppreciationPayment,
  skipPendingPayment,
};
