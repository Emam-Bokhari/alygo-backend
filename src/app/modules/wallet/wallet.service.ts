import { ClientSession, Types } from "mongoose";
import mongoose from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { Wallet } from "./wallet.model";
import { User } from "../user/user.model";
import { TransactionService } from "../transaction/transaction.service";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "../ride/ride.constant";
import stripe from "../../../config/stripe";
import config from "../../../config";
import stripeService from "../stripe/stripe.service";
import { PlatformSettingsService } from "../platformSettings/platformSettings.service";

/**
 * Safely find or create a user's wallet (passengers or drivers)
 */
const getOrCreateWallet = async (
  userId: string | Types.ObjectId,
  session?: ClientSession,
): Promise<any> => {
  const userObjectId = new Types.ObjectId(userId);
  let wallet = await Wallet.findOne({ userId: userObjectId }).session(
    session || null,
  );

  if (!wallet) {
    const platformCurrency =
      await PlatformSettingsService.getPlatformCurrency();
    const [newWallet] = await Wallet.create(
      [
        {
          userId: userObjectId,
          balance: 0,
          currency: platformCurrency.toUpperCase(),
        },
      ],
      { session },
    );
    wallet = newWallet;
  }

  return wallet;
};

/**
 * Get wallet details and balance
 */
const getWalletBalance = async (userId: string): Promise<any> => {
  return await getOrCreateWallet(userId);
};

/**
 * Get wallet transaction history
 */
const getWalletHistory = async (
  userId: string,
  role?: string,
  filter: string = "all",
): Promise<any> => {
  await getOrCreateWallet(userId);
  return await TransactionService.getTransactionsByUser(userId, role, filter);
};

/**
 * Deduct balance from wallet
 */
const deductBalance = async (
  userId: string,
  amount: number,
  description: string,
  session?: ClientSession,
  rideId?: string | Types.ObjectId,
): Promise<void> => {
  const wallet = await getOrCreateWallet(userId, session);

  if (wallet.balance < amount) {
    throw new ApiError(400, "Insufficient wallet balance");
  }

  wallet.balance -= amount;
  await wallet.save({ session });

  const platformCurrency = await PlatformSettingsService.getPlatformCurrency();

  // Create transaction record
  await TransactionService.createTransaction(
    {
      userId: new Types.ObjectId(userId),
      walletId: wallet._id,
      amount: amount,
      currency: platformCurrency.toUpperCase(),
      paymentMethod: PAYMENT_METHOD.WALLET,
      paymentStatus: PAYMENT_STATUS.PAID,
      transactionType: TRANSACTION_TYPE.CANCELLATION_FEE,
      description,
      rideId: rideId ? new Types.ObjectId(rideId) : undefined,
    },
    session,
  );
};

/**
 * Add balance to wallet (for driver compensation, etc.)
 */
const addBalance = async (
  userId: string,
  amount: number,
  description: string,
  session?: ClientSession,
  transactionType?: TRANSACTION_TYPE,
  rideId?: string | Types.ObjectId,
): Promise<void> => {
  const wallet = await getOrCreateWallet(userId, session);

  wallet.balance += amount;
  await wallet.save({ session });

  const platformCurrency = await PlatformSettingsService.getPlatformCurrency();

  // Create transaction record
  await TransactionService.createTransaction(
    {
      userId: new Types.ObjectId(userId),
      walletId: wallet._id,
      amount: amount,
      currency: platformCurrency.toUpperCase(),
      paymentMethod: PAYMENT_METHOD.WALLET,
      paymentStatus: PAYMENT_STATUS.PAID,
      transactionType:
        transactionType || TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
      description,
      rideId: rideId ? new Types.ObjectId(rideId) : undefined,
    },
    session,
  );
};

/**
 * Initiate a wallet top-up by creating a Stripe PaymentIntent
 */
const topUpWallet = async (
  userId: string,
  amount: number,
): Promise<{ checkoutUrl: string; sessionId: string }> => {
  if (amount <= 0) {
    throw new ApiError(400, "Top-up amount must be greater than zero.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // Ensure Stripe Customer exists for this user
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;
    user.stripeCustomerId = customer.id;
    await user.save();
  }

  // Success and cancel URLs pointing to backend pages
  const successUrl = `${config.stripe.BASE_URL || "http://10.10.7.10:5005"}/api/v1/stripe/payment/success?session_id={CHECKOUT_SESSION_ID}&type=wallet_topup`;
  const cancelUrl = `${config.stripe.BASE_URL || "http://10.10.7.10:5005"}/api/v1/stripe/payment/cancel?session_id={CHECKOUT_SESSION_ID}&type=wallet_topup`;

  const platformCurrency = await PlatformSettingsService.getPlatformCurrency();

  // Create Stripe Checkout Session
  const session = await stripeService.createCheckoutSession(
    amount,
    platformCurrency.toLowerCase(),
    {
      type: "wallet_topup",
      userId,
      amount: amount.toString(),
    },
    stripeCustomerId,
    successUrl,
    cancelUrl,
  );

  const wallet = await getOrCreateWallet(userId);

  // Record a pending transaction
  await TransactionService.createTransaction({
    userId: new Types.ObjectId(userId),
    walletId: wallet._id,
    amount,
    currency: platformCurrency.toUpperCase(),
    paymentMethod: PAYMENT_METHOD.STRIPE,
    paymentStatus: PAYMENT_STATUS.PENDING,
    transactionType: TRANSACTION_TYPE.WALLET_TOPUP,
    stripeCustomerId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: session.payment_intent
      ? (session.payment_intent as string)
      : undefined,
    gatewayTransactionId: session.payment_intent
      ? (session.payment_intent as string)
      : session.id,
    description: `Wallet top-up of ${amount} ${platformCurrency.toUpperCase()} initiated.`,
  });

  return {
    checkoutUrl: session.url!,
    sessionId: session.id,
  };
};

export const WalletService = {
  getOrCreateWallet,
  getWalletBalance,
  getWalletHistory,
  deductBalance,
  addBalance,
  topUpWallet,
};
