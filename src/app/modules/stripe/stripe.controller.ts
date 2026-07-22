import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";
import { Ride } from "../ride/ride.model";
import { Transaction } from "../transaction/transaction.model";
import stripeService from "./stripe.service";
import stripe from "../../../config/stripe";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { RideServices } from "../ride/ride.service";
import { WalletService } from "../wallet/wallet.service";
import { Wallet } from "../wallet/wallet.model";
import { TransactionService } from "../transaction/transaction.service";
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  RIDE_STATUS,
} from "../ride/ride.constant";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import mongoose, { Types } from "mongoose";
import { socketHelper } from "../../../helpers/socketHelper";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { handleStripeWebhook } from "../../../helpers/webhooks/handleStripeWebhook";

// ----------------------------------------------------
// Stripe Connected Account for Drivers (Onboarding)
// ----------------------------------------------------
const createStripeAccount = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  const stripeAccount = await stripeService.createConnectedAccount(
    user.email,
    user.id,
  );

  // Update Driver's Stripe account ID
  await Driver.findOneAndUpdate(
    { userId: user.id },
    { stripeConnectedAccountId: stripeAccount.id },
  );

  await User.findByIdAndUpdate(user.id, {
    stripeConnectedAccountId: stripeAccount.id,
  });

  const returnUrl = `${config.stripe.BASE_URL || "http://10.10.7.41:5005"}/stripe/onboarding/success`;
  const refreshUrl = `${config.stripe.BASE_URL || "http://10.10.7.41:5005"}/stripe/onboarding/refresh`;

  const onboardingLink = await stripeService.createAccountLink(
    stripeAccount.id,
    returnUrl,
    refreshUrl,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Stripe account created successfully",
    data: { link: onboardingLink },
  });
});

const getStripeDashboardLink = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    // Retrieve driver profile
    const driver = await mongoose.model("Driver").findOne({ userId: user.id });
    const connectedAccountId =
      driver?.stripeConnectedAccountId || user.stripeConnectedAccountId;

    if (!connectedAccountId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Stripe account not connected",
      );
    }

    const dashboardLink =
      await stripeService.createLoginLink(connectedAccountId);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Stripe Dashboard link generated",
      data: { url: dashboardLink },
    });
  },
);

const getAccountDetails = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const driver = await mongoose.model("Driver").findOne({ userId: user.id });
  const connectedAccountId =
    driver?.stripeConnectedAccountId || user.stripeConnectedAccountId;

  if (!connectedAccountId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Stripe account not connected");
  }

  const account = await stripeService.retrieveAccount(connectedAccountId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Stripe account details retrieved",
    data: {
      accountId: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
    },
  });
});

// ----------------------------------------------------
// Passenger Payments
// ----------------------------------------------------
const createCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { rideId, useWallet } = req.body;

    const ride = await Ride.findOne({ _id: rideId, userId });
    if (!ride) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Ride not found or unauthorized.",
      );
    }

    if (ride.status !== RIDE_STATUS.COMPLETED) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Ride must be completed before payment.",
      );
    }

    if (ride.payment.status === PAYMENT_STATUS.PAID) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "This ride is already paid.");
    }

    const totalFare = ride.fare.total;
    let walletDeduction = 0;
    let chargeAmount = totalFare;

    if (useWallet) {
      const wallet = await WalletService.getOrCreateWallet(userId);
      walletDeduction = Math.min(wallet.balance, totalFare);
      chargeAmount = totalFare - walletDeduction;
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Passenger user profile not found.",
      );
    }

    // Handle wallet-only payment direct completion internally
    if (chargeAmount === 0) {
      const result = await RideServices.completeRidePayment(
        rideId,
        PAYMENT_METHOD.WALLET,
      );

      return sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Ride payment completed successfully using wallet balance.",
        data: {
          checkoutUrl: null,
          sessionId: null,
          totalFare,
          walletDeduction,
          chargeAmount,
          paymentStatus: PAYMENT_STATUS.PAID,
          result,
        },
      });
    }

    const stripeCustomerId = await stripeService.getOrCreateCustomer(
      userId,
      user.email,
      user.name,
    );

    // Success and cancel URLs pointing to frontend pages
    const successUrl = `${config.client_url || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}&rideId=${rideId}`;
    const cancelUrl = `${config.client_url || "http://localhost:3000"}/payment/cancel?session_id={CHECKOUT_SESSION_ID}&rideId=${rideId}`;

    const session = await stripeService.createCheckoutSession(
      chargeAmount,
      config.stripe.currency || "usd",
      {
        type: "ride_payment",
        rideId: ride._id.toString(),
        userId,
        useWallet: useWallet ? "true" : "false",
        walletAmount: walletDeduction.toString(),
        amount: chargeAmount.toString(),
        currency: config.stripe.currency || "usd",
      },
      stripeCustomerId,
      successUrl,
      cancelUrl,
    );

    // Save Stripe Checkout Session and Payment Intent details to Ride
    ride.payment.stripeCheckoutSessionId = session.id;
    if (session.payment_intent) {
      ride.payment.stripePaymentIntentId = session.payment_intent as string;
    }
    await ride.save();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
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
  },
);

const getPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { id: paymentIntentId } = req.params;
  const paymentIntent =
    await stripeService.retrievePaymentIntent(paymentIntentId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Payment intent status retrieved",
    data: {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    },
  });
});

// ----------------------------------------------------
// Refunds
// ----------------------------------------------------
const refundTransaction = catchAsync(async (req: Request, res: Response) => {
  const { transactionId, amount } = req.body;

  const transaction = await Transaction.findOne({
    $or: [{ transactionId }, { gatewayTransactionId: transactionId }],
  });

  if (!transaction) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Transaction not found.");
  }

  if (transaction.paymentStatus === PAYMENT_STATUS.REFUNDED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Transaction is already refunded.",
    );
  }

  const refundAmount = amount ? Number(amount) : transaction.amount;
  let refundId = "";

  if (
    transaction.paymentMethod !== PAYMENT_METHOD.WALLET &&
    transaction.gatewayTransactionId
  ) {
    const stripeRefund = await stripeService.refundPayment(
      transaction.gatewayTransactionId,
      refundAmount,
    );
    refundId = stripeRefund.id;
  } else {
    // Refund to Wallet
    const wallet = await WalletService.getOrCreateWallet(transaction.userId);
    wallet.balance = parseFloat((wallet.balance + refundAmount).toFixed(2));
    await wallet.save();
  }

  // Mark original transaction as Refunded
  transaction.paymentStatus = PAYMENT_STATUS.REFUNDED;
  await transaction.save();

  // Create Refund Transaction
  const refundTxn = await TransactionService.createTransaction({
    userId: transaction.userId,
    driverId: transaction.driverId,
    bookingId: transaction.bookingId,
    rideId: transaction.rideId,
    amount: refundAmount,
    paymentMethod: transaction.paymentMethod,
    paymentStatus: PAYMENT_STATUS.PAID,
    transactionType: TRANSACTION_TYPE.REFUND,
    stripeRefundId: refundId,
    gatewayTransactionId: refundId || undefined,
    description: `Refund for original transaction ${transaction.transactionId}`,
  });

  // If associated with a ride, update the ride status
  if (transaction.bookingId) {
    await Ride.findByIdAndUpdate(transaction.bookingId, {
      "payment.status": PAYMENT_STATUS.REFUNDED,
    });
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Refund processed successfully",
    data: refundTxn,
  });
});

// ----------------------------------------------------
// Stripe Webhook Event Handler
// ----------------------------------------------------
const handleWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send("Missing Stripe signature header");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody,
      signature,
      config.stripe.webhookSecret,
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send(`Webhook Error: ${err.message}`);
  }

  try {
    await handleStripeWebhook(event);
    res.status(StatusCodes.OK).json({ received: true });
  } catch (error: any) {
    console.error(
      `Error processing Stripe Webhook (${event.type}):`,
      error.message || error,
    );
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(`Webhook processing error: ${error.message}`);
  }
};

export const StripeControllers = {
  createStripeAccount,
  getStripeDashboardLink,
  getAccountDetails,
  createCheckoutSession,
  getPaymentStatus,
  refundTransaction,
  handleWebhook,
};
