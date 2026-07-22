import { Types } from "mongoose";
import mongoose from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { Payout } from "./payout.model";
import { Driver } from "../driver/driver.model";
import { WalletService } from "../wallet/wallet.service";
import { TransactionService } from "../transaction/transaction.service";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "../ride/ride.constant";
import { PAYOUT_STATUS, PAYOUT_METHOD } from "./payout.constant";
import stripe from "../../../config/stripe";
import config from "../../../config";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { socketHelper } from "../../../helpers/socketHelper";

const generatePayoutId = (): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${dateStr}-${randomSuffix}`;
};

/**
 * Handle Driver withdrawal request
 */
const requestWithdrawal = async (
  driverUserId: string,
  amount: number,
): Promise<any> => {
  if (amount <= 0) {
    throw new ApiError(400, "Withdrawal amount must be greater than zero.");
  }

  // 1. Find Driver profile
  const driver = await Driver.findOne({ userId: driverUserId });
  if (!driver) {
    throw new ApiError(404, "Driver profile not found.");
  }

  // 2. Validate Stripe onboarding
  if (!driver.stripeConnectedAccountId) {
    throw new ApiError(
      400,
      "No connected Stripe account found. Please link your Stripe account first.",
    );
  }

  // Retrieve stripe account to check details_submitted
  const stripeAccount = await stripe.accounts.retrieve(
    driver.stripeConnectedAccountId,
  );
  if (!stripeAccount.details_submitted) {
    throw new ApiError(
      400,
      "Your Stripe Connected account onboarding is incomplete. Please finish onboarding.",
    );
  }

  if (!driver.isStripeOnboarded) {
    driver.isStripeOnboarded = true;
    await driver.save();
  }

  // 3. Find and check Driver wallet balance
  const wallet = await WalletService.getOrCreateWallet(driverUserId);
  if (wallet.balance < amount) {
    throw new ApiError(400, "Insufficient wallet balance.");
  }

  // 4. Initiate Stripe Transfer from Platform Account to Connected Account
  let transfer;
  try {
    transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: config.stripe.currency || "usd",
      destination: driver.stripeConnectedAccountId,
      description: `Withdrawal payout for Driver: ${driverUserId}`,
      metadata: {
        driverUserId,
        walletId: wallet._id.toString(),
      },
    });
  } catch (error: any) {
    throw new ApiError(
      500,
      `Stripe payout transfer failed: ${error.message || error}`,
    );
  }

  // 5. Commit wallet balance deduction and log transactions/payout records
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Deduct driver's wallet balance
    wallet.balance = parseFloat((wallet.balance - amount).toFixed(2));
    await wallet.save({ session });

    const payoutId = generatePayoutId();

    // Create Transaction ledger record
    const transaction = await TransactionService.createTransaction(
      {
        userId: new Types.ObjectId(driverUserId),
        driverId: driver._id,
        walletId: wallet._id,
        amount,
        currency: config.stripe.currency || "usd",
        paymentMethod: PAYMENT_METHOD.STRIPE,
        paymentStatus: PAYMENT_STATUS.PAID,
        transactionType: TRANSACTION_TYPE.PAYOUT,
        stripeTransferId: transfer.id,
        gatewayTransactionId: transfer.id,
        description: `Driver withdrawal payout of ${amount} to Stripe connected account.`,
      },
      session,
    );

    // Create Payout record
    const [payout] = await Payout.create(
      [
        {
          payoutId,
          userId: new Types.ObjectId(driverUserId),
          amount,
          currency: config.stripe.currency || "usd",
          status: PAYOUT_STATUS.COMPLETED,
          method: PAYOUT_METHOD.STRIPE,
          destinationAccountId: driver.stripeConnectedAccountId,
          transactionId: transaction._id,
          processedAt: new Date(),
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    // Send Realtime notifications & updates
    socketHelper.sendToUser(driverUserId, "wallet-updated", {
      balance: wallet.balance,
    });
    socketHelper.sendToUser(driverUserId, "withdrawal-success", {
      payoutId,
      amount,
      processedAt: payout.processedAt,
    });

    await sendNotifications({
      title: "Withdrawal Successful",
      text: `Your withdrawal request of ${amount} has been successfully processed via Stripe.`,
      receiver: new Types.ObjectId(driverUserId),
      type: NOTIFICATION_TYPE.DRIVER,
      referenceId: payout._id,
      referenceModel: "Payout" as any,
    });

    return payout;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Get withdrawal payout history
 */
const getWithdrawalHistory = async (driverUserId: string): Promise<any[]> => {
  return await Payout.find({ userId: new Types.ObjectId(driverUserId) })
    .sort({ createdAt: -1 })
    .populate("transactionId");
};

export const PayoutService = {
  requestWithdrawal,
  getWithdrawalHistory,
};
