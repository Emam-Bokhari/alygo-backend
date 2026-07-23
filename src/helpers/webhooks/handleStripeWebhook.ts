import stripe from "../../config/stripe";
import config from "../../config";
import mongoose, { Types } from "mongoose";
import { User } from "../../app/modules/user/user.model";
import { Driver } from "../../app/modules/driver/driver.model";
import { Ride } from "../../app/modules/ride/ride.model";
import { Transaction } from "../../app/modules/transaction/transaction.model";
import { WalletService } from "../../app/modules/wallet/wallet.service";
import { TransactionService } from "../../app/modules/transaction/transaction.service";
import { RideServices } from "../../app/modules/ride/ride.service";
import { PendingPaymentService } from "../../app/modules/pendingPayment/pendingPayment.service";
import { ReferralService } from "../../app/modules/referral/referral.service";
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from "../../app/modules/ride/ride.constant";
import { TRANSACTION_TYPE } from "../../app/modules/transaction/transaction.constant";
import { socketHelper } from "../socketHelper";
import { sendNotifications } from "../notificationsHelper";
import { NOTIFICATION_TYPE } from "../../app/modules/notification/notification.constant";

/**
 * Business logic to handle cryptographically verified Stripe webhook events
 */
export const handleStripeWebhook = async (event: any): Promise<void> => {
  const eventType = event.type;

  switch (eventType) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const metadata = session.metadata || {};

      if (metadata.type === "wallet_topup") {
        const userId = metadata.userId;
        const amount = parseFloat(metadata.amount);
        const paymentIntentId = session.payment_intent as string;

        const tx = await Transaction.findOne({
          $or: [
            { stripeCheckoutSessionId: session.id },
            { stripePaymentIntentId: paymentIntentId },
            { gatewayTransactionId: paymentIntentId },
          ],
          paymentStatus: PAYMENT_STATUS.PENDING,
        });

        if (tx) {
          const dbSession = await mongoose.startSession();
          dbSession.startTransaction();
          try {
            const wallet = await WalletService.getOrCreateWallet(
              userId,
              dbSession,
            );
            wallet.balance = parseFloat((wallet.balance + amount).toFixed(2));
            await wallet.save({ session: dbSession });

            tx.paymentStatus = PAYMENT_STATUS.PAID;
            tx.stripeCheckoutSessionId = session.id;
            if (paymentIntentId) {
              tx.stripePaymentIntentId = paymentIntentId;
              tx.gatewayTransactionId = paymentIntentId;
            }
            tx.gatewayResponse = session;
            await tx.save({ session: dbSession });

            await dbSession.commitTransaction();
            dbSession.endSession();

            // Notify passenger via sockets & push notifications
            socketHelper.sendToUser(userId, "wallet-updated", {
              balance: wallet.balance,
            });
            await sendNotifications({
              title: "Wallet Top-up Successful",
              text: `Your wallet top-up of ${amount} was successful.`,
              receiver: new Types.ObjectId(userId),
              type: NOTIFICATION_TYPE.USER,
              referenceId: wallet._id,
              referenceModel: "Wallet" as any,
            });

            // Trigger Passenger referral check
            ReferralService.checkAndProcessPassengerReferral(userId).catch((err) => {
              console.error("Passenger referral check error during top-up webhook:", err);
            });
          } catch (error) {
            await dbSession.abortTransaction();
            dbSession.endSession();
            throw error;
          }
        }
      } else if (metadata.type === "ride_payment") {
        const rideId = metadata.rideId;
        const paymentIntentId = session.payment_intent as string;

        let paymentIntent = null;
        if (paymentIntentId) {
          try {
            paymentIntent =
              await stripe.paymentIntents.retrieve(paymentIntentId);
          } catch (err: any) {
            console.error(
              `Error retrieving payment intent ${paymentIntentId} for checkout session:`,
              err.message || err,
            );
          }
        }

        await RideServices.completeRidePayment(
          rideId,
          PAYMENT_METHOD.STRIPE,
          paymentIntent || { id: paymentIntentId, customer: session.customer },
          session.id,
        );
      } else if (metadata.type === "cancellation_fee") {
        await PendingPaymentService.processCancellationFeePayment(session.id);
      } else if (metadata.type === "driver_appreciation") {
        await PendingPaymentService.processDriverAppreciationPayment(
          session.id,
        );
      } else if (metadata.type === "lost_found_payment") {
        const paymentIntentId = session.payment_intent as string;
        const { LostAndFoundService } = require("../../app/modules/lostAndFound/lostAndFound.service");
        await LostAndFoundService.completeLostFoundPayment(
          metadata.reportId,
          paymentIntentId,
          session,
        );
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const paymentIntentId = session.payment_intent as string;

      await Transaction.findOneAndUpdate(
        {
          $or: [
            { stripeCheckoutSessionId: session.id },
            { stripePaymentIntentId: paymentIntentId },
            { gatewayTransactionId: paymentIntentId || session.id },
          ],
          paymentStatus: PAYMENT_STATUS.PENDING,
        },
        { paymentStatus: PAYMENT_STATUS.FAILED, gatewayResponse: session },
      );

      if (metadata.type === "ride_payment" && metadata.rideId) {
        await Ride.findByIdAndUpdate(metadata.rideId, {
          "payment.status": PAYMENT_STATUS.FAILED,
        });
      } else if (metadata.type === "lost_found_payment" && metadata.reportId) {
        const { LostAndFoundService } = require("../../app/modules/lostAndFound/lostAndFound.service");
        await LostAndFoundService.handleLostFoundPaymentFailed(metadata.reportId, session);
      }
      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata || {};
      console.log(
        `payment_intent.succeeded received for type: ${metadata.type || "unknown"}. Skipping fulfillment logic in this event as it is handled by checkout.session.completed.`,
      );
      break;
    }

    case "payment_intent.payment_failed":
    case "payment_intent.canceled": {
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata || {};

      await Transaction.findOneAndUpdate(
        { gatewayTransactionId: paymentIntent.id },
        {
          paymentStatus: PAYMENT_STATUS.FAILED,
          gatewayResponse: paymentIntent,
        },
      );

      if (metadata.rideId) {
        await Ride.findByIdAndUpdate(metadata.rideId, {
          "payment.status": PAYMENT_STATUS.FAILED,
        });
      } else if (metadata.type === "lost_found_payment" && metadata.reportId) {
        const { LostAndFoundService } = require("../../app/modules/lostAndFound/lostAndFound.service");
        await LostAndFoundService.handleLostFoundPaymentFailed(metadata.reportId, paymentIntent);
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      // Mark original transaction as refunded in DB
      await Transaction.findOneAndUpdate(
        { gatewayTransactionId: charge.payment_intent },
        { paymentStatus: PAYMENT_STATUS.REFUNDED },
      );
      break;
    }

    case "payout.paid":
    case "payout.failed": {
      // Log direct driver payouts status if needed
      break;
    }

    case "account.updated": {
      const account = event.data.object;
      console.log("Account updated:", account.id, {
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
      });

      // Find driver by userId in metadata, or by stripeConnectedAccountId
      let driver = null;
      if (account.metadata?.userId) {
        driver = await Driver.findOne({ userId: account.metadata.userId });
      }
      if (!driver) {
        driver = await Driver.findOne({ stripeConnectedAccountId: account.id });
      }

      if (driver) {
        const updateData: any = {
          stripeConnectedAccountId: account.id,
        };

        // If Stripe onboarding is complete, set isStripeOnboarded to true
        if (account.details_submitted) {
          updateData.isStripeOnboarded = true;
        }

        await Driver.findByIdAndUpdate(driver._id, updateData);
        console.log(
          `Updated driver onboarding status for driver:`,
          driver._id,
          {
            stripeConnectedAccountId: account.id,
            isStripeOnboarded: updateData.isStripeOnboarded || false,
          },
        );
      } else {
        console.warn(`No driver found for Stripe account ${account.id}`);
      }

      // Find user by stripeConnectedAccountId and update if needed
      if (account.metadata?.userId) {
        await User.findByIdAndUpdate(account.metadata.userId, {
          stripeConnectedAccountId: account.id,
        });
      }
      break;
    }

    case "person.created":
    case "person.updated": {
      const person = event.data.object;
      console.log("Person updated:", person.id, "for account:", person.account);
      break;
    }

    case "account.external_account.created": {
      const externalAccount = event.data.object;
      console.log(
        "External account created:",
        externalAccount.id,
        "for account:",
        externalAccount.account,
      );
      break;
    }

    default:
      console.log(`Unhandled Stripe Webhook event type: ${eventType}`);
  }
};
