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
exports.WalletService = void 0;
const mongoose_1 = require("mongoose");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const wallet_model_1 = require("./wallet.model");
const user_model_1 = require("../user/user.model");
const transaction_service_1 = require("../transaction/transaction.service");
const transaction_constant_1 = require("../transaction/transaction.constant");
const ride_constant_1 = require("../ride/ride.constant");
const stripe_1 = __importDefault(require("../../../config/stripe"));
const config_1 = __importDefault(require("../../../config"));
const stripe_service_1 = __importDefault(require("../stripe/stripe.service"));
/**
 * Safely find or create a user's wallet (passengers or drivers)
 */
const getOrCreateWallet = (userId, session) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userObjectId = new mongoose_1.Types.ObjectId(userId);
    let wallet = yield wallet_model_1.Wallet.findOne({
      userId: userObjectId,
    }).session(session || null);
    if (!wallet) {
      const [newWallet] = yield wallet_model_1.Wallet.create(
        [
          {
            userId: userObjectId,
            balance: 0,
            currency: config_1.default.stripe.currency || "USD",
          },
        ],
        { session },
      );
      wallet = newWallet;
    }
    return wallet;
  });
/**
 * Get wallet details and balance
 */
const getWalletBalance = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    return yield getOrCreateWallet(userId);
  });
/**
 * Get wallet transaction history
 */
const getWalletHistory = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    yield getOrCreateWallet(userId);
    return yield transaction_service_1.TransactionService.getTransactionsByUser(
      userId,
    );
  });
/**
 * Deduct balance from wallet
 */
const deductBalance = (userId, amount, description, session) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const wallet = yield getOrCreateWallet(userId, session);
    if (wallet.balance < amount) {
      throw new ApiErrors_1.default(400, "Insufficient wallet balance");
    }
    wallet.balance -= amount;
    yield wallet.save({ session });
    // Create transaction record
    yield transaction_service_1.TransactionService.createTransaction(
      {
        userId: new mongoose_1.Types.ObjectId(userId),
        walletId: wallet._id,
        amount: amount,
        currency: config_1.default.stripe.currency || "usd",
        paymentMethod: ride_constant_1.PAYMENT_METHOD.WALLET,
        paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
        transactionType:
          transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_FEE,
        description,
      },
      session,
    );
  });
/**
 * Add balance to wallet (for driver compensation, etc.)
 */
const addBalance = (userId, amount, description, session, transactionType) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const wallet = yield getOrCreateWallet(userId, session);
    wallet.balance += amount;
    yield wallet.save({ session });
    // Create transaction record
    yield transaction_service_1.TransactionService.createTransaction(
      {
        userId: new mongoose_1.Types.ObjectId(userId),
        walletId: wallet._id,
        amount: amount,
        currency: config_1.default.stripe.currency || "usd",
        paymentMethod: ride_constant_1.PAYMENT_METHOD.WALLET,
        paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
        transactionType:
          transactionType ||
          transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
        description,
      },
      session,
    );
  });
/**
 * Initiate a wallet top-up by creating a Stripe PaymentIntent
 */
const topUpWallet = (userId, amount) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (amount <= 0) {
      throw new ApiErrors_1.default(
        400,
        "Top-up amount must be greater than zero.",
      );
    }
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
      throw new ApiErrors_1.default(404, "User not found.");
    }
    // Ensure Stripe Customer exists for this user
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = yield stripe_1.default.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = customer.id;
      yield user.save();
    }
    // Success and cancel URLs pointing to frontend wallet pages
    const successUrl = `${config_1.default.client_url || "http://localhost:3000"}/wallet/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${config_1.default.client_url || "http://localhost:3000"}/wallet/cancel?session_id={CHECKOUT_SESSION_ID}`;
    // Create Stripe Checkout Session
    const session = yield stripe_service_1.default.createCheckoutSession(
      amount,
      config_1.default.stripe.currency || "usd",
      {
        type: "wallet_topup",
        userId,
        amount: amount.toString(),
      },
      stripeCustomerId,
      successUrl,
      cancelUrl,
    );
    const wallet = yield getOrCreateWallet(userId);
    // Record a pending transaction
    yield transaction_service_1.TransactionService.createTransaction({
      userId: new mongoose_1.Types.ObjectId(userId),
      walletId: wallet._id,
      amount,
      currency: config_1.default.stripe.currency || "usd",
      paymentMethod: ride_constant_1.PAYMENT_METHOD.STRIPE,
      paymentStatus: ride_constant_1.PAYMENT_STATUS.PENDING,
      transactionType: transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP,
      stripeCustomerId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent
        ? session.payment_intent
        : undefined,
      gatewayTransactionId: session.payment_intent
        ? session.payment_intent
        : session.id,
      description: `Wallet top-up of ${amount} ${config_1.default.stripe.currency || "USD"} initiated.`,
    });
    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  });
exports.WalletService = {
  getOrCreateWallet,
  getWalletBalance,
  getWalletHistory,
  deductBalance,
  addBalance,
  topUpWallet,
};
