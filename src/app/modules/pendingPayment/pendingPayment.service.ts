import { PendingPayment } from "./pendingPayment.model";
import { IPendingPayment } from "./pendingPayment.interface";
import ApiError from "../../../errors/ApiErrors";
import { Ride } from "../ride/ride.model";
import { Transaction } from "../transaction/transaction.model";
import { TransactionService } from "../transaction/transaction.service";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "../ride/ride.constant";
import { Wallet } from "../wallet/wallet.model";
import { WalletService } from "../wallet/wallet.service";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import mongoose from "mongoose";
import stripeService from "../stripe/stripe.service";
import config from "../../../config";

/**
 * Get all pending payments for a user
 */
const getPendingPaymentsByUser = async (
  userId: string,
): Promise<IPendingPayment[]> => {
  const pendingPayments = await PendingPayment.find({
    userId,
    status: "pending",
  }).populate("rideId");

  return pendingPayments;
};

/**
 * Pay cancellation fee immediately using Stripe Checkout
 */
const payCancellationFeeNow = async (
  userId: string,
  pendingPaymentId: string,
): Promise<{ checkoutUrl: string; sessionId: string; expiresAt: string }> => {
  const pendingPayment = await PendingPayment.findById(pendingPaymentId);

  if (!pendingPayment) {
    throw new ApiError(404, "Pending payment not found");
  }

  if (pendingPayment.userId.toString() !== userId) {
    throw new ApiError(403, "You do not have permission to pay this fee");
  }

  if (pendingPayment.status === "paid") {
    throw new ApiError(409, "Payment already completed.");
  }

  if (pendingPayment.status === "voided") {
    throw new ApiError(400, "Pending payment has been cancelled.");
  }

  if (pendingPayment.status !== "pending") {
    throw new ApiError(400, "Pending payment has expired.");
  }

  // Handle existing active checkout session
  if (pendingPayment.stripeSessionId) {
    try {
      const existingSession = await stripeService.retrieveSession(
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
          checkoutUrl: existingSession.url!,
          sessionId: existingSession.id,
          expiresAt: new Date(existingSession.expires_at * 1000).toISOString(),
        };
      } else {
        // Expire the session if it's open but does not meet requirements
        if (existingSession.status === "open") {
          await stripeService.expireSession(pendingPayment.stripeSessionId);
        }
      }
    } catch (err) {
      console.error("Error checking or expiring existing stripe session:", err);
    }
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Get or create Stripe customer
  const stripeCustomerId = await stripeService.getOrCreateCustomer(
    userId,
    user.email,
    user.name,
  );

  // Success and cancel URLs
  const successUrl = `${config.client_url || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=${pendingPayment.type}&pendingPaymentId=${pendingPaymentId}`;
  const cancelUrl = `${config.client_url || "http://localhost:3000"}/payment/cancel?session_id={CHECKOUT_SESSION_ID}&type=${pendingPayment.type}&pendingPaymentId=${pendingPaymentId}`;

  // Fetch ride to get cancellation reason
  let cancellationReasonId = "";
  if (pendingPayment.type === "cancellation_fee") {
    const ride = await Ride.findById(pendingPayment.rideId);
    cancellationReasonId =
      ride?.cancellation?.cancellationReasonId?.toString() || "";
  }

  const metadata: Record<string, string> = {
    type: pendingPayment.type,
    pendingPaymentId: pendingPaymentId,
    rideId: pendingPayment.rideId.toString(),
    userId: userId,
    amount: pendingPayment.amount.toString(),
    currency: config.stripe.currency || "usd",
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
  const session = await stripeService.createCheckoutSession(
    pendingPayment.amount,
    config.stripe.currency || "usd",
    metadata,
    stripeCustomerId,
    successUrl,
    cancelUrl,
  );

  // Save session details to the pending payment
  pendingPayment.stripeSessionId = session.id;
  pendingPayment.checkoutSessionExpiresAt = new Date(session.expires_at * 1000);
  pendingPayment.paymentAttemptCount =
    (pendingPayment.paymentAttemptCount || 0) + 1;
  await pendingPayment.save();

  return {
    checkoutUrl: session.url!,
    sessionId: session.id,
    expiresAt: new Date(session.expires_at * 1000).toISOString(),
  };
};

/**
 * Process successful cancellation fee payment (webhook handler)
 */
const processCancellationFeePayment = async (
  sessionId: string,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find pending payment by session ID from metadata
    const stripeSession = await stripeService.retrieveSession(sessionId);
    const pendingPaymentId = stripeSession.metadata?.pendingPaymentId;

    if (!pendingPaymentId) {
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const pendingPayment =
      await PendingPayment.findById(pendingPaymentId).session(session);

    if (!pendingPayment) {
      await session.abortTransaction();
      session.endSession();
      return;
    }

    if (pendingPayment.status !== "pending") {
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Get ride to find driver for compensation
    const ride = await Ride.findById(pendingPayment.rideId).session(session);

    // Update pending payment status
    pendingPayment.status = "paid";
    await pendingPayment.save({ session });

    // Create transaction record for the cancellation fee payment
    await TransactionService.createTransaction(
      {
        userId: pendingPayment.userId,
        rideId: pendingPayment.rideId,
        transactionType: TRANSACTION_TYPE.CANCELLATION_FEE,
        amount: pendingPayment.amount,
        paymentMethod: PAYMENT_METHOD.STRIPE,
        paymentStatus: PAYMENT_STATUS.PAID,
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: stripeSession.payment_intent as string,
        description: `Cancellation fee payment of ${pendingPayment.amount} via Stripe.`,
      },
      session,
    );

    // Credit driver compensation if applicable
    const driverCompensation =
      pendingPayment.driverCompensation !== undefined
        ? pendingPayment.driverCompensation
        : ride?.cancellation?.driverCompensation || 0;

    if (ride && ride.driverId && driverCompensation > 0) {
      await WalletService.addBalance(
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
      await ride.save({ session });
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Pay cancellation fee or driver appreciation using wallet balance
 */
const payCancellationFeeWithWallet = async (
  userId: string,
  pendingPaymentId: string,
): Promise<IPendingPayment> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const pendingPayment =
      await PendingPayment.findById(pendingPaymentId).session(session);

    if (!pendingPayment) {
      throw new ApiError(404, "Pending payment not found");
    }

    if (pendingPayment.userId.toString() !== userId) {
      throw new ApiError(403, "You do not have permission to pay this fee");
    }

    if (pendingPayment.status !== "pending") {
      throw new ApiError(400, "This payment has already been processed");
    }

    // Check wallet balance
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) {
      throw new ApiError(404, "Wallet not found");
    }

    if (wallet.balance < pendingPayment.amount) {
      throw new ApiError(400, "Insufficient wallet balance");
    }

    const isAppreciation = pendingPayment.type === "driver_appreciation";

    // Deduct from wallet
    await WalletService.deductBalance(
      userId,
      pendingPayment.amount,
      isAppreciation
        ? `Driver appreciation tip for ride ${pendingPayment.rideId}`
        : `Cancellation fee payment for ride ${pendingPayment.rideId}`,
      session,
    );

    // Update pending payment status
    pendingPayment.status = "paid";
    await pendingPayment.save({ session });

    // Create transaction record
    await TransactionService.createTransaction(
      {
        userId: pendingPayment.userId,
        rideId: pendingPayment.rideId,
        transactionType: isAppreciation
          ? TRANSACTION_TYPE.DRIVER_APPRECIATION
          : TRANSACTION_TYPE.CANCELLATION_FEE,
        amount: pendingPayment.amount,
        paymentMethod: PAYMENT_METHOD.WALLET,
        paymentStatus: PAYMENT_STATUS.PAID,
        description: isAppreciation
          ? `Driver appreciation tip of ${pendingPayment.amount} via wallet.`
          : `Cancellation fee payment of ${pendingPayment.amount} via wallet.`,
      },
      session,
    );

    if (isAppreciation) {
      // Credit driver wallet and update stats
      if (pendingPayment.driverId) {
        const driver = await Driver.findById(pendingPayment.driverId).session(
          session,
        );
        if (driver) {
          await WalletService.addBalance(
            driver.userId.toString(),
            pendingPayment.amount,
            `Driver appreciation tip for ride ${pendingPayment.rideId}`,
            session,
            TRANSACTION_TYPE.DRIVER_APPRECIATION,
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
          await driver.save({ session });
        }
      }
    } else {
      // Get ride to find driver for compensation (cancellation fee)
      const ride = await Ride.findById(pendingPayment.rideId).session(session);

      // Credit driver compensation if applicable
      const walletDriverCompensation =
        pendingPayment.driverCompensation !== undefined
          ? pendingPayment.driverCompensation
          : ride?.cancellation?.driverCompensation || 0;

      if (ride && ride.driverId && walletDriverCompensation > 0) {
        await WalletService.addBalance(
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
        await ride.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return pendingPayment;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Process successful driver appreciation payment (webhook handler)
 */
const processDriverAppreciationPayment = async (
  sessionId: string,
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const stripeSession = await stripeService.retrieveSession(sessionId);
    const pendingPaymentId = stripeSession.metadata?.pendingPaymentId;

    if (!pendingPaymentId) {
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const pendingPayment =
      await PendingPayment.findById(pendingPaymentId).session(session);

    if (!pendingPayment) {
      await session.abortTransaction();
      session.endSession();
      return;
    }

    if (pendingPayment.status !== "pending") {
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Update pending payment status
    pendingPayment.status = "paid";
    await pendingPayment.save({ session });

    // Create transaction record
    await TransactionService.createTransaction(
      {
        userId: pendingPayment.userId,
        rideId: pendingPayment.rideId,
        transactionType: TRANSACTION_TYPE.DRIVER_APPRECIATION,
        amount: pendingPayment.amount,
        paymentMethod: PAYMENT_METHOD.STRIPE,
        paymentStatus: PAYMENT_STATUS.PAID,
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: stripeSession.payment_intent as string,
        description: `Driver appreciation payment of ${pendingPayment.amount} via Stripe.`,
      },
      session,
    );

    // Credit driver wallet and update appreciation statistics
    if (pendingPayment.driverId) {
      const driver = await Driver.findById(pendingPayment.driverId).session(
        session,
      );
      if (driver) {
        // Driver userId is the User document ID
        await WalletService.addBalance(
          driver.userId.toString(),
          pendingPayment.amount,
          `Driver appreciation tip for ride ${pendingPayment.rideId}`,
          session,
          TRANSACTION_TYPE.DRIVER_APPRECIATION,
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
        await driver.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Skip/void a pending payment (for driver appreciation)
 */
const skipPendingPayment = async (
  userId: string,
  pendingPaymentId: string,
): Promise<IPendingPayment> => {
  const pendingPayment = await PendingPayment.findById(pendingPaymentId);

  if (!pendingPayment) {
    throw new ApiError(404, "Pending payment not found");
  }

  if (pendingPayment.userId.toString() !== userId) {
    throw new ApiError(403, "You do not have permission to skip this payment");
  }

  if (pendingPayment.status !== "pending") {
    throw new ApiError(400, "This payment has already been processed");
  }

  // Only allow skipping driver appreciation payments
  if (pendingPayment.type !== "driver_appreciation") {
    throw new ApiError(400, "Only driver appreciation payments can be skipped");
  }

  // Update pending payment status to voided
  pendingPayment.status = "voided";
  await pendingPayment.save();

  return pendingPayment;
};

export const PendingPaymentService = {
  getPendingPaymentsByUser,
  payCancellationFeeNow,
  processCancellationFeePayment,
  payCancellationFeeWithWallet,
  processDriverAppreciationPayment,
  skipPendingPayment,
};
