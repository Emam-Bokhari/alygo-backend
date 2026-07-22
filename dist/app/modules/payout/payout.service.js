"use strict";
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
exports.PayoutService = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const payout_model_1 = require("./payout.model");
const driver_model_1 = require("../driver/driver.model");
const wallet_service_1 = require("../wallet/wallet.service");
const transaction_service_1 = require("../transaction/transaction.service");
const transaction_constant_1 = require("../transaction/transaction.constant");
const ride_constant_1 = require("../ride/ride.constant");
const payout_constant_1 = require("./payout.constant");
const stripe_1 = __importDefault(require("../../../config/stripe"));
const config_1 = __importDefault(require("../../../config"));
const notificationsHelper_1 = require("../../../helpers/notificationsHelper");
const notification_constant_1 = require("../notification/notification.constant");
const socketHelper_1 = require("../../../helpers/socketHelper");
const generatePayoutId = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `PAY-${dateStr}-${randomSuffix}`;
};
/**
 * Handle Driver withdrawal request
 */
const requestWithdrawal = (driverUserId, amount) => __awaiter(void 0, void 0, void 0, function* () {
    if (amount <= 0) {
        throw new ApiErrors_1.default(400, "Withdrawal amount must be greater than zero.");
    }
    // 1. Find Driver profile
    const driver = yield driver_model_1.Driver.findOne({ userId: driverUserId });
    if (!driver) {
        throw new ApiErrors_1.default(404, "Driver profile not found.");
    }
    // 2. Validate Stripe onboarding
    if (!driver.stripeConnectedAccountId) {
        throw new ApiErrors_1.default(400, "No connected Stripe account found. Please link your Stripe account first.");
    }
    // Retrieve stripe account to check details_submitted
    const stripeAccount = yield stripe_1.default.accounts.retrieve(driver.stripeConnectedAccountId);
    if (!stripeAccount.details_submitted) {
        throw new ApiErrors_1.default(400, "Your Stripe Connected account onboarding is incomplete. Please finish onboarding.");
    }
    if (!driver.isStripeOnboarded) {
        driver.isStripeOnboarded = true;
        yield driver.save();
    }
    // 3. Find and check Driver wallet balance
    const wallet = yield wallet_service_1.WalletService.getOrCreateWallet(driverUserId);
    if (wallet.balance < amount) {
        throw new ApiErrors_1.default(400, "Insufficient wallet balance.");
    }
    // 4. Initiate Stripe Transfer from Platform Account to Connected Account
    let transfer;
    try {
        transfer = yield stripe_1.default.transfers.create({
            amount: Math.round(amount * 100), // convert to cents
            currency: config_1.default.stripe.currency || "usd",
            destination: driver.stripeConnectedAccountId,
            description: `Withdrawal payout for Driver: ${driverUserId}`,
            metadata: {
                driverUserId,
                walletId: wallet._id.toString(),
            },
        });
    }
    catch (error) {
        throw new ApiErrors_1.default(500, `Stripe payout transfer failed: ${error.message || error}`);
    }
    // 5. Commit wallet balance deduction and log transactions/payout records
    const session = yield mongoose_2.default.startSession();
    session.startTransaction();
    try {
        // Deduct driver's wallet balance
        wallet.balance = parseFloat((wallet.balance - amount).toFixed(2));
        yield wallet.save({ session });
        const payoutId = generatePayoutId();
        // Create Transaction ledger record
        const transaction = yield transaction_service_1.TransactionService.createTransaction({
            userId: new mongoose_1.Types.ObjectId(driverUserId),
            driverId: driver._id,
            walletId: wallet._id,
            amount,
            currency: config_1.default.stripe.currency || "usd",
            paymentMethod: ride_constant_1.PAYMENT_METHOD.STRIPE,
            paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
            transactionType: transaction_constant_1.TRANSACTION_TYPE.PAYOUT,
            stripeTransferId: transfer.id,
            gatewayTransactionId: transfer.id,
            description: `Driver withdrawal payout of ${amount} to Stripe connected account.`,
        }, session);
        // Create Payout record
        const [payout] = yield payout_model_1.Payout.create([
            {
                payoutId,
                userId: new mongoose_1.Types.ObjectId(driverUserId),
                amount,
                currency: config_1.default.stripe.currency || "usd",
                status: payout_constant_1.PAYOUT_STATUS.COMPLETED,
                method: payout_constant_1.PAYOUT_METHOD.STRIPE,
                destinationAccountId: driver.stripeConnectedAccountId,
                transactionId: transaction._id,
                processedAt: new Date(),
            },
        ], { session });
        yield session.commitTransaction();
        session.endSession();
        // Send Realtime notifications & updates
        socketHelper_1.socketHelper.sendToUser(driverUserId, "wallet-updated", {
            balance: wallet.balance,
        });
        socketHelper_1.socketHelper.sendToUser(driverUserId, "withdrawal-success", {
            payoutId,
            amount,
            processedAt: payout.processedAt,
        });
        yield (0, notificationsHelper_1.sendNotifications)({
            title: "Withdrawal Successful",
            text: `Your withdrawal request of ${amount} has been successfully processed via Stripe.`,
            receiver: new mongoose_1.Types.ObjectId(driverUserId),
            type: notification_constant_1.NOTIFICATION_TYPE.DRIVER,
            referenceId: payout._id,
            referenceModel: "Payout",
        });
        return payout;
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
/**
 * Get withdrawal payout history
 */
const getWithdrawalHistory = (driverUserId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield payout_model_1.Payout.find({ userId: new mongoose_1.Types.ObjectId(driverUserId) })
        .sort({ createdAt: -1 })
        .populate("transactionId");
});
exports.PayoutService = {
    requestWithdrawal,
    getWithdrawalHistory,
};
