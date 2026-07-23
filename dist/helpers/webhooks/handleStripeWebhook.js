"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStripeWebhook = void 0;
const stripe_1 = __importDefault(require("../../config/stripe"));
const mongoose_1 = __importStar(require("mongoose"));
const user_model_1 = require("../../app/modules/user/user.model");
const driver_model_1 = require("../../app/modules/driver/driver.model");
const ride_model_1 = require("../../app/modules/ride/ride.model");
const transaction_model_1 = require("../../app/modules/transaction/transaction.model");
const wallet_service_1 = require("../../app/modules/wallet/wallet.service");
const ride_service_1 = require("../../app/modules/ride/ride.service");
const pendingPayment_service_1 = require("../../app/modules/pendingPayment/pendingPayment.service");
const referral_service_1 = require("../../app/modules/referral/referral.service");
const ride_constant_1 = require("../../app/modules/ride/ride.constant");
const socketHelper_1 = require("../socketHelper");
const notificationsHelper_1 = require("../notificationsHelper");
const notification_constant_1 = require("../../app/modules/notification/notification.constant");
/**
 * Business logic to handle cryptographically verified Stripe webhook events
 */
const handleStripeWebhook = (event) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const eventType = event.type;
    switch (eventType) {
        case "checkout.session.completed": {
            const session = event.data.object;
            const metadata = session.metadata || {};
            if (metadata.type === "wallet_topup") {
                const userId = metadata.userId;
                const amount = parseFloat(metadata.amount);
                const paymentIntentId = session.payment_intent;
                const tx = yield transaction_model_1.Transaction.findOne({
                    $or: [
                        { stripeCheckoutSessionId: session.id },
                        { stripePaymentIntentId: paymentIntentId },
                        { gatewayTransactionId: paymentIntentId },
                    ],
                    paymentStatus: ride_constant_1.PAYMENT_STATUS.PENDING,
                });
                if (tx) {
                    const dbSession = yield mongoose_1.default.startSession();
                    dbSession.startTransaction();
                    try {
                        const wallet = yield wallet_service_1.WalletService.getOrCreateWallet(userId, dbSession);
                        wallet.balance = parseFloat((wallet.balance + amount).toFixed(2));
                        yield wallet.save({ session: dbSession });
                        tx.paymentStatus = ride_constant_1.PAYMENT_STATUS.PAID;
                        tx.stripeCheckoutSessionId = session.id;
                        if (paymentIntentId) {
                            tx.stripePaymentIntentId = paymentIntentId;
                            tx.gatewayTransactionId = paymentIntentId;
                        }
                        tx.gatewayResponse = session;
                        yield tx.save({ session: dbSession });
                        yield dbSession.commitTransaction();
                        dbSession.endSession();
                        // Notify passenger via sockets & push notifications
                        socketHelper_1.socketHelper.sendToUser(userId, "wallet-updated", {
                            balance: wallet.balance,
                        });
                        yield (0, notificationsHelper_1.sendNotifications)({
                            title: "Wallet Top-up Successful",
                            text: `Your wallet top-up of ${amount} was successful.`,
                            receiver: new mongoose_1.Types.ObjectId(userId),
                            type: notification_constant_1.NOTIFICATION_TYPE.USER,
                            referenceId: wallet._id,
                            referenceModel: "Wallet",
                        });
                        // Trigger Passenger referral check
                        referral_service_1.ReferralService.checkAndProcessPassengerReferral(userId).catch((err) => {
                            console.error("Passenger referral check error during top-up webhook:", err);
                        });
                    }
                    catch (error) {
                        yield dbSession.abortTransaction();
                        dbSession.endSession();
                        throw error;
                    }
                }
            }
            else if (metadata.type === "ride_payment") {
                const rideId = metadata.rideId;
                const paymentIntentId = session.payment_intent;
                let paymentIntent = null;
                if (paymentIntentId) {
                    try {
                        paymentIntent =
                            yield stripe_1.default.paymentIntents.retrieve(paymentIntentId);
                    }
                    catch (err) {
                        console.error(`Error retrieving payment intent ${paymentIntentId} for checkout session:`, err.message || err);
                    }
                }
                yield ride_service_1.RideServices.completeRidePayment(rideId, ride_constant_1.PAYMENT_METHOD.STRIPE, paymentIntent || { id: paymentIntentId, customer: session.customer }, session.id);
            }
            else if (metadata.type === "cancellation_fee") {
                yield pendingPayment_service_1.PendingPaymentService.processCancellationFeePayment(session.id);
            }
            else if (metadata.type === "driver_appreciation") {
                yield pendingPayment_service_1.PendingPaymentService.processDriverAppreciationPayment(session.id);
            }
            else if (metadata.type === "lost_found_payment") {
                const paymentIntentId = session.payment_intent;
                const { LostAndFoundService, } = require("../../app/modules/lostAndFound/lostAndFound.service");
                yield LostAndFoundService.completeLostFoundPayment(metadata.reportId, paymentIntentId, session);
            }
            break;
        }
        case "checkout.session.expired": {
            const session = event.data.object;
            const metadata = session.metadata || {};
            const paymentIntentId = session.payment_intent;
            yield transaction_model_1.Transaction.findOneAndUpdate({
                $or: [
                    { stripeCheckoutSessionId: session.id },
                    { stripePaymentIntentId: paymentIntentId },
                    { gatewayTransactionId: paymentIntentId || session.id },
                ],
                paymentStatus: ride_constant_1.PAYMENT_STATUS.PENDING,
            }, { paymentStatus: ride_constant_1.PAYMENT_STATUS.FAILED, gatewayResponse: session });
            if (metadata.type === "ride_payment" && metadata.rideId) {
                yield ride_model_1.Ride.findByIdAndUpdate(metadata.rideId, {
                    "payment.status": ride_constant_1.PAYMENT_STATUS.FAILED,
                });
            }
            else if (metadata.type === "lost_found_payment" && metadata.reportId) {
                const { LostAndFoundService, } = require("../../app/modules/lostAndFound/lostAndFound.service");
                yield LostAndFoundService.handleLostFoundPaymentFailed(metadata.reportId, session);
            }
            break;
        }
        case "payment_intent.succeeded": {
            const paymentIntent = event.data.object;
            const metadata = paymentIntent.metadata || {};
            console.log(`payment_intent.succeeded received for type: ${metadata.type || "unknown"}. Skipping fulfillment logic in this event as it is handled by checkout.session.completed.`);
            break;
        }
        case "payment_intent.payment_failed":
        case "payment_intent.canceled": {
            const paymentIntent = event.data.object;
            const metadata = paymentIntent.metadata || {};
            yield transaction_model_1.Transaction.findOneAndUpdate({ gatewayTransactionId: paymentIntent.id }, {
                paymentStatus: ride_constant_1.PAYMENT_STATUS.FAILED,
                gatewayResponse: paymentIntent,
            });
            if (metadata.rideId) {
                yield ride_model_1.Ride.findByIdAndUpdate(metadata.rideId, {
                    "payment.status": ride_constant_1.PAYMENT_STATUS.FAILED,
                });
            }
            else if (metadata.type === "lost_found_payment" && metadata.reportId) {
                const { LostAndFoundService, } = require("../../app/modules/lostAndFound/lostAndFound.service");
                yield LostAndFoundService.handleLostFoundPaymentFailed(metadata.reportId, paymentIntent);
            }
            break;
        }
        case "charge.refunded": {
            const charge = event.data.object;
            // Mark original transaction as refunded in DB
            yield transaction_model_1.Transaction.findOneAndUpdate({ gatewayTransactionId: charge.payment_intent }, { paymentStatus: ride_constant_1.PAYMENT_STATUS.REFUNDED });
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
            if ((_a = account.metadata) === null || _a === void 0 ? void 0 : _a.userId) {
                driver = yield driver_model_1.Driver.findOne({ userId: account.metadata.userId });
            }
            if (!driver) {
                driver = yield driver_model_1.Driver.findOne({ stripeConnectedAccountId: account.id });
            }
            if (driver) {
                const updateData = {
                    stripeConnectedAccountId: account.id,
                };
                // If Stripe onboarding is complete, set isStripeOnboarded to true
                if (account.details_submitted) {
                    updateData.isStripeOnboarded = true;
                }
                yield driver_model_1.Driver.findByIdAndUpdate(driver._id, updateData);
                console.log(`Updated driver onboarding status for driver:`, driver._id, {
                    stripeConnectedAccountId: account.id,
                    isStripeOnboarded: updateData.isStripeOnboarded || false,
                });
            }
            else {
                console.warn(`No driver found for Stripe account ${account.id}`);
            }
            // Find user by stripeConnectedAccountId and update if needed
            if ((_b = account.metadata) === null || _b === void 0 ? void 0 : _b.userId) {
                yield user_model_1.User.findByIdAndUpdate(account.metadata.userId, {
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
            console.log("External account created:", externalAccount.id, "for account:", externalAccount.account);
            break;
        }
        default:
            console.log(`Unhandled Stripe Webhook event type: ${eventType}`);
    }
});
exports.handleStripeWebhook = handleStripeWebhook;
