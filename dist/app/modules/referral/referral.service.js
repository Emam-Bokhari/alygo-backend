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
exports.ReferralService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importStar(require("mongoose"));
const http_status_codes_1 = require("http-status-codes");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const user_1 = require("../../../enums/user");
const user_model_1 = require("../user/user.model");
const referral_model_1 = require("./referral.model");
const referral_interface_1 = require("./referral.interface");
const ride_model_1 = require("../ride/ride.model");
const ride_constant_1 = require("../ride/ride.constant");
const systemConfigHelper_1 = require("../../../helpers/systemConfigHelper");
const notificationsHelper_1 = require("../../../helpers/notificationsHelper");
const notification_constant_1 = require("../notification/notification.constant");
const wallet_service_1 = require("../wallet/wallet.service");
const transaction_model_1 = require("../transaction/transaction.model");
const transaction_constant_1 = require("../transaction/transaction.constant");
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
/**
 * Generate a unique-ish referral code.
 */
const generateReferralCode = (name, role) => {
    const cleanName = name.replace(/[^A-Za-z]/g, "").toUpperCase();
    const namePart = cleanName.slice(0, 4).padEnd(3, "X");
    const randomPart = crypto_1.default.randomInt(100, 999).toString();
    const prefix = role === user_1.USER_ROLES.DRIVER ? "DRV" : "ALY";
    return `${prefix}${namePart}${randomPart}`;
};
/**
 * Retrieve or lazily generate a referral code for a user.
 */
const getOrCreateReferralCode = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User not found");
    }
    if (user.referralCode) {
        return user.referralCode;
    }
    let code = "";
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 15) {
        code = generateReferralCode(user.name, user.role);
        const existing = yield user_model_1.User.findOne({ referralCode: code });
        if (!existing) {
            isUnique = true;
        }
        attempts++;
    }
    if (!isUnique) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, "Failed to generate unique referral code");
    }
    user.referralCode = code;
    yield user.save();
    return code;
});
/**
 * Handles referral linkage during signup.
 */
const handleReferralSignup = (refereeId, referralCode) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const cleanCode = referralCode.trim().toUpperCase();
    // Find referee user
    const referee = yield user_model_1.User.findById(refereeId);
    if (!referee)
        return;
    // Ensure referee has not been referred before
    const existingReferral = yield referral_model_1.Referral.findOne({ refereeId });
    if (existingReferral)
        return;
    // Find referrer
    const referrer = yield user_model_1.User.findOne({ referralCode: cleanCode });
    if (!referrer)
        return; // Invalid code, ignore
    // Self referral check
    if (referrer._id.toString() === refereeId.toString())
        return;
    // Circular referral check
    if (referrer.referredById && referrer.referredById.toString() === refereeId.toString())
        return;
    // Enforce program matching
    if (referrer.role === user_1.USER_ROLES.DRIVER && referee.role === user_1.USER_ROLES.DRIVER) {
        const config = yield (0, systemConfigHelper_1.getSystemConfig)();
        if (!((_b = (_a = config.referral) === null || _a === void 0 ? void 0 : _a.driver) === null || _b === void 0 ? void 0 : _b.enabled))
            return;
        referee.referredById = referrer._id;
        yield referee.save();
        const referral = yield referral_model_1.Referral.create({
            referrerId: referrer._id,
            refereeId: referee._id,
            referredDriverId: referee._id,
            referralCode: cleanCode,
            referrerRole: "driver",
            referralType: "DRIVER",
            status: referral_interface_1.REFERRAL_STATUS.ACTIVE,
            ridesCompleted: 0,
            qualificationProgress: 0,
            qualificationTarget: config.referral.driver.requiredCompletedTrips || 10,
            rewardAmount: config.referral.driver.rewardAmount || 100,
            rewardCurrency: config.referral.driver.rewardCurrency || "USD",
            rewardStatus: referral_interface_1.REWARD_STATUS.PENDING,
            joinedAt: new Date(),
            auditLogs: [
                {
                    action: "REFERRAL_CREATED",
                    details: { message: "Driver referral created and linked." },
                    timestamp: new Date(),
                },
            ],
        });
        // Realtime events
        const socketIo = global.io;
        if (socketIo) {
            socketIo.emit(`driver-referral-progress::${referrer._id}`, {
                refereeId: referee._id,
                progress: 0,
                target: referral.qualificationTarget,
                status: referral_interface_1.REFERRAL_STATUS.ACTIVE,
            });
            socketIo.emit("referral-updated", { referralId: referral._id, type: "DRIVER" });
        }
        // Push notification to Referrer Driver
        yield (0, notificationsHelper_1.sendNotifications)({
            title: "New Driver Joined",
            text: `${referee.name} has joined using your referral code.`,
            receiver: referrer._id,
            type: notification_constant_1.NOTIFICATION_TYPE.DRIVER,
            referenceId: referral._id,
            referenceModel: "Referral",
        });
    }
    else if (referrer.role === user_1.USER_ROLES.USER && referee.role === user_1.USER_ROLES.USER) {
        const config = yield (0, systemConfigHelper_1.getSystemConfig)();
        if (!((_d = (_c = config.referral) === null || _c === void 0 ? void 0 : _c.passenger) === null || _d === void 0 ? void 0 : _d.enabled))
            return;
        referee.referredById = referrer._id;
        yield referee.save();
        const referral = yield referral_model_1.Referral.create({
            referrerId: referrer._id,
            refereeId: referee._id,
            referredUserId: referee._id,
            referralCode: cleanCode,
            referrerRole: "user",
            referralType: "USER",
            status: referral_interface_1.REFERRAL_STATUS.PENDING,
            ridesCompleted: 0,
            qualificationProgress: 0,
            qualificationTarget: config.referral.passenger.requiredCompletedTrips || 1,
            rewardAmount: config.referral.passenger.rewardAmount || 20,
            rewardCurrency: config.referral.passenger.rewardCurrency || "USD",
            rewardStatus: referral_interface_1.REWARD_STATUS.PENDING,
            joinedAt: new Date(),
            auditLogs: [
                {
                    action: "REFERRAL_CREATED",
                    details: { message: "Passenger referral created and linked." },
                    timestamp: new Date(),
                },
            ],
        });
        // Realtime events
        const socketIo = global.io;
        if (socketIo) {
            socketIo.emit(`referral-progress::${referrer._id}`, {
                refereeId: referee._id,
                progress: 0,
                target: referral.qualificationTarget,
                status: referral_interface_1.REFERRAL_STATUS.PENDING,
            });
            socketIo.emit("referral-updated", { referralId: referral._id, type: "USER" });
        }
        // Push notification to Referrer Passenger
        yield (0, notificationsHelper_1.sendNotifications)({
            title: "Friend Joined",
            text: `${referee.name} has signed up using your referral code.`,
            receiver: referrer._id,
            type: notification_constant_1.NOTIFICATION_TYPE.USER,
            referenceId: referral._id,
            referenceModel: "Referral",
        });
    }
});
/**
 * Handle Driver completed rides updating and qualification checks.
 */
const handleDriverRideCompletion = (driverUserId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const referral = yield referral_model_1.Referral.findOne({
        referredDriverId: driverUserId,
        referralType: "DRIVER",
        status: { $in: [referral_interface_1.REFERRAL_STATUS.ACTIVE, referral_interface_1.REFERRAL_STATUS.PENDING, "in_progress"] },
    });
    if (!referral)
        return;
    const config = yield (0, systemConfigHelper_1.getSystemConfig)();
    if (!((_b = (_a = config.referral) === null || _a === void 0 ? void 0 : _a.driver) === null || _b === void 0 ? void 0 : _b.enabled))
        return;
    const expiryDate = new Date(referral.joinedAt.getTime() +
        config.referral.driver.qualificationDays * 24 * 60 * 60 * 1000);
    if (new Date() > expiryDate) {
        referral.status = referral_interface_1.REFERRAL_STATUS.EXPIRED;
        referral.auditLogs.push({
            action: "EXPIRED",
            details: { message: "Driver qualification period has expired." },
            timestamp: new Date(),
        });
        yield referral.save();
        return;
    }
    // Count verified completed rides by referee driver within qualification window
    const ridesCompleted = yield ride_model_1.Ride.countDocuments({
        driverId: driverUserId,
        status: ride_constant_1.RIDE_STATUS.COMPLETED,
        completedAt: { $gte: referral.joinedAt, $lte: expiryDate },
    });
    referral.qualificationProgress = ridesCompleted;
    referral.ridesCompleted = ridesCompleted; // compatibility
    referral.auditLogs.push({
        action: "RIDE_COMPLETED",
        details: { message: `Referee driver completed ride. Progress: ${ridesCompleted}/${referral.qualificationTarget}` },
        timestamp: new Date(),
    });
    const socketIo = global.io;
    if (socketIo) {
        socketIo.emit(`driver-referral-progress::${referral.referrerId}`, {
            refereeId: referral.refereeId,
            progress: ridesCompleted,
            target: referral.qualificationTarget,
            status: referral.status,
        });
    }
    // Notify referrer of progress update
    yield (0, notificationsHelper_1.sendNotifications)({
        title: "Referral Progress Updated",
        text: `Your referred driver completed a ride. Progress: ${ridesCompleted}/${referral.qualificationTarget}.`,
        receiver: referral.referrerId,
        type: notification_constant_1.NOTIFICATION_TYPE.DRIVER,
    });
    if (ridesCompleted >= referral.qualificationTarget) {
        referral.status = referral_interface_1.REFERRAL_STATUS.COMPLETED;
        referral.completedAt = new Date();
        referral.qualificationCompletedAt = new Date();
        referral.auditLogs.push({
            action: "QUALIFICATION_COMPLETED",
            details: { message: "Driver satisfied completed ride requirements." },
            timestamp: new Date(),
        });
        if (socketIo) {
            socketIo.emit(`driver-referral-qualified::${referral.referrerId}`, {
                refereeId: referral.refereeId,
                rewardAmount: referral.rewardAmount,
            });
            socketIo.emit("referral-updated", { referralId: referral._id, type: "DRIVER" });
        }
        yield (0, notificationsHelper_1.sendNotifications)({
            title: "Reward Qualified",
            text: "Referred driver successfully completed the required ride count.",
            receiver: referral.referrerId,
            type: notification_constant_1.NOTIFICATION_TYPE.DRIVER,
        });
        // Award wallet payout
        if (config.referral.driver.autoRewardEnabled && !referral.rewardPaid) {
            const paidRewardsCount = yield referral_model_1.Referral.countDocuments({
                referrerId: referral.referrerId,
                referralType: "DRIVER",
                rewardPaid: true,
            });
            if (paidRewardsCount < config.referral.driver.maximumRewardsPerDriver) {
                const session = yield mongoose_1.default.startSession();
                session.startTransaction();
                try {
                    const wallet = yield wallet_service_1.WalletService.getOrCreateWallet(referral.referrerId, session);
                    wallet.balance = parseFloat((wallet.balance + referral.rewardAmount).toFixed(2));
                    yield wallet.save({ session });
                    const uniqueTxnRef = `TXN-REF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
                    const [transaction] = yield transaction_model_1.Transaction.create([
                        {
                            transactionId: uniqueTxnRef,
                            userId: referral.referrerId,
                            walletId: wallet._id,
                            amount: referral.rewardAmount,
                            currency: referral.rewardCurrency,
                            paymentMethod: ride_constant_1.PAYMENT_METHOD.WALLET,
                            paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
                            transactionType: transaction_constant_1.TRANSACTION_TYPE.DRIVER_REFERRAL_REWARD,
                            description: `Referral Reward payout for successfully inviting a qualified driver.`,
                        },
                    ], { session });
                    referral.rewardPaid = true;
                    referral.rewardPaidAt = new Date();
                    referral.rewardStatus = referral_interface_1.REWARD_STATUS.PAID;
                    referral.rewardTransactionId = transaction._id;
                    referral.auditLogs.push({
                        action: "REWARD_PAID",
                        actor: referral.referrerId,
                        actorRole: "driver",
                        details: { transactionId: transaction._id, amount: referral.rewardAmount },
                        timestamp: new Date(),
                    });
                    yield referral.save({ session });
                    yield session.commitTransaction();
                    session.endSession();
                    // Sockets & notifications
                    if (socketIo) {
                        socketIo.emit(`wallet-updated::${referral.referrerId}`, { balance: wallet.balance });
                        socketIo.emit(`driver-referral-paid::${referral.referrerId}`, {
                            amount: referral.rewardAmount,
                            transactionId: transaction._id,
                        });
                    }
                    yield (0, notificationsHelper_1.sendNotifications)({
                        title: "Referral Reward Paid",
                        text: `Your referral reward of ${referral.rewardAmount} ${referral.rewardCurrency} has been credited to your wallet.`,
                        receiver: referral.referrerId,
                        type: notification_constant_1.NOTIFICATION_TYPE.DRIVER,
                    });
                    // Admin notification
                    yield (0, notificationsHelper_1.sendNotifications)({
                        title: "Referral Payout Processed",
                        text: `Driver referral reward of ${referral.rewardAmount} paid to referrer ${referral.referrerId}.`,
                        type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
                    });
                }
                catch (error) {
                    yield session.abortTransaction();
                    session.endSession();
                    console.error("Failed to process driver referral wallet credit:", error);
                }
            }
            else {
                referral.auditLogs.push({
                    action: "LIMIT_EXCEEDED",
                    details: { message: "Referrer driver has reached maximum reward payout cap." },
                    timestamp: new Date(),
                });
            }
        }
    }
    yield referral.save();
});
/**
 * Handle Passenger completed actions and qualification checks.
 */
const checkAndProcessPassengerReferral = (passengerUserId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const referral = yield referral_model_1.Referral.findOne({
        referredUserId: passengerUserId,
        referralType: "USER",
        status: { $in: [referral_interface_1.REFERRAL_STATUS.PENDING, referral_interface_1.REFERRAL_STATUS.ACTIVE, "joined"] },
    });
    if (!referral)
        return;
    const config = yield (0, systemConfigHelper_1.getSystemConfig)();
    if (!((_b = (_a = config.referral) === null || _a === void 0 ? void 0 : _a.passenger) === null || _b === void 0 ? void 0 : _b.enabled))
        return;
    const expiryDate = new Date(referral.joinedAt.getTime() +
        config.referral.passenger.qualificationDays * 24 * 60 * 60 * 1000);
    if (new Date() > expiryDate) {
        referral.status = referral_interface_1.REFERRAL_STATUS.EXPIRED;
        referral.auditLogs.push({
            action: "EXPIRED",
            details: { message: "Passenger qualification window expired." },
            timestamp: new Date(),
        });
        yield referral.save();
        return;
    }
    let qualified = false;
    const qType = config.referral.passenger.qualificationType;
    if (qType === "rides") {
        const tripCount = yield ride_model_1.Ride.countDocuments({
            userId: passengerUserId,
            status: ride_constant_1.RIDE_STATUS.COMPLETED,
            completedAt: { $gte: referral.joinedAt, $lte: expiryDate },
        });
        referral.qualificationProgress = tripCount;
        qualified = tripCount >= referral.qualificationTarget;
    }
    else if (qType === "topup") {
        const topupsResult = yield transaction_model_1.Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose_1.Types.ObjectId(passengerUserId),
                    transactionType: transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP,
                    paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
                    createdAt: { $gte: referral.joinedAt, $lte: expiryDate },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const totalTopup = ((_c = topupsResult[0]) === null || _c === void 0 ? void 0 : _c.total) || 0;
        referral.qualificationProgress = totalTopup;
        qualified = totalTopup >= (config.referral.passenger.minimumWalletTopup || referral.rewardAmount);
    }
    else if (qType === "booking") {
        const bookingsResult = yield transaction_model_1.Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose_1.Types.ObjectId(passengerUserId),
                    transactionType: transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                    paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
                    createdAt: { $gte: referral.joinedAt, $lte: expiryDate },
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const totalBooking = ((_d = bookingsResult[0]) === null || _d === void 0 ? void 0 : _d.total) || 0;
        referral.qualificationProgress = totalBooking;
        qualified = totalBooking >= (config.referral.passenger.minimumBookingAmount || 1);
    }
    referral.auditLogs.push({
        action: "QUALIFICATION_EVALUATED",
        details: { message: `Evaluated Passenger conditions. Progress: ${referral.qualificationProgress}/${referral.qualificationTarget}` },
        timestamp: new Date(),
    });
    const socketIo = global.io;
    if (socketIo) {
        socketIo.emit(`referral-progress::${referral.referrerId}`, {
            refereeId: referral.refereeId,
            progress: referral.qualificationProgress,
            target: referral.qualificationTarget,
            status: referral.status,
        });
    }
    // Notify progress
    yield (0, notificationsHelper_1.sendNotifications)({
        title: "Friend Referral Progress",
        text: `Your referred friend is participating. Progress: ${referral.qualificationProgress}/${referral.qualificationTarget}.`,
        receiver: referral.referrerId,
        type: notification_constant_1.NOTIFICATION_TYPE.USER,
    });
    if (qualified) {
        referral.status = referral_interface_1.REFERRAL_STATUS.COMPLETED;
        referral.completedAt = new Date();
        referral.qualificationCompletedAt = new Date();
        referral.auditLogs.push({
            action: "QUALIFICATION_COMPLETED",
            details: { message: "Passenger satisfied referral conditions successfully." },
            timestamp: new Date(),
        });
        if (socketIo) {
            socketIo.emit(`referral-qualified::${referral.referrerId}`, {
                refereeId: referral.refereeId,
                rewardAmount: referral.rewardAmount,
            });
            socketIo.emit("referral-updated", { referralId: referral._id, type: "USER" });
        }
        yield (0, notificationsHelper_1.sendNotifications)({
            title: "Reward Qualified",
            text: "Your referred friend successfully completed the conditions.",
            receiver: referral.referrerId,
            type: notification_constant_1.NOTIFICATION_TYPE.USER,
        });
        // Payout rewards
        if (config.referral.passenger.autoRewardEnabled && !referral.rewardPaid) {
            const paidCount = yield referral_model_1.Referral.countDocuments({
                referrerId: referral.referrerId,
                referralType: "USER",
                rewardPaid: true,
            });
            const allowed = config.referral.passenger.allowMultipleRewards || paidCount === 0;
            if (allowed && paidCount < config.referral.passenger.maximumRewardsPerUser) {
                const session = yield mongoose_1.default.startSession();
                session.startTransaction();
                try {
                    const wallet = yield wallet_service_1.WalletService.getOrCreateWallet(referral.referrerId, session);
                    wallet.balance = parseFloat((wallet.balance + referral.rewardAmount).toFixed(2));
                    yield wallet.save({ session });
                    const uniqueTxnRef = `TXN-REF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
                    const [transaction] = yield transaction_model_1.Transaction.create([
                        {
                            transactionId: uniqueTxnRef,
                            userId: referral.referrerId,
                            walletId: wallet._id,
                            amount: referral.rewardAmount,
                            currency: referral.rewardCurrency,
                            paymentMethod: ride_constant_1.PAYMENT_METHOD.WALLET,
                            paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
                            transactionType: transaction_constant_1.TRANSACTION_TYPE.USER_REFERRAL_REWARD,
                            description: `Referral Bonus payout for successfully inviting a qualified passenger.`,
                        },
                    ], { session });
                    referral.rewardPaid = true;
                    referral.rewardPaidAt = new Date();
                    referral.rewardStatus = referral_interface_1.REWARD_STATUS.PAID;
                    referral.rewardTransactionId = transaction._id;
                    referral.auditLogs.push({
                        action: "REWARD_PAID",
                        actor: referral.referrerId,
                        actorRole: "user",
                        details: { transactionId: transaction._id, amount: referral.rewardAmount },
                        timestamp: new Date(),
                    });
                    yield referral.save({ session });
                    yield session.commitTransaction();
                    session.endSession();
                    // Sockets & notifications
                    if (socketIo) {
                        socketIo.emit(`wallet-updated::${referral.referrerId}`, { balance: wallet.balance });
                        socketIo.emit(`referral-reward::${referral.referrerId}`, {
                            amount: referral.rewardAmount,
                            transactionId: transaction._id,
                        });
                    }
                    yield (0, notificationsHelper_1.sendNotifications)({
                        title: "Referral Reward Paid",
                        text: `Your referral bonus of ${referral.rewardAmount} ${referral.rewardCurrency} has been credited to your wallet.`,
                        receiver: referral.referrerId,
                        type: notification_constant_1.NOTIFICATION_TYPE.USER,
                    });
                    // Admin notification
                    yield (0, notificationsHelper_1.sendNotifications)({
                        title: "Referral Reward Issued",
                        text: `Passenger referral reward of ${referral.rewardAmount} paid to referrer ${referral.referrerId}.`,
                        type: notification_constant_1.NOTIFICATION_TYPE.ADMIN,
                    });
                }
                catch (error) {
                    yield session.abortTransaction();
                    session.endSession();
                    console.error("Failed to process passenger referral wallet credit:", error);
                }
            }
            else {
                referral.auditLogs.push({
                    action: "LIMIT_EXCEEDED",
                    details: { message: "Referrer user has reached passenger payout limits." },
                    timestamp: new Date(),
                });
            }
        }
    }
    yield referral.save();
});
/**
 * Get dynamic referral program rules configured in System Config.
 */
const getRules = (role) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const config = yield (0, systemConfigHelper_1.getSystemConfig)();
    const lowerRole = role ? role.toLowerCase() : "user";
    if (lowerRole === "driver") {
        const dConf = (_a = config.referral) === null || _a === void 0 ? void 0 : _a.driver;
        return {
            enabled: (_b = dConf === null || dConf === void 0 ? void 0 : dConf.enabled) !== null && _b !== void 0 ? _b : true,
            rewardAmount: (_c = dConf === null || dConf === void 0 ? void 0 : dConf.rewardAmount) !== null && _c !== void 0 ? _c : 100,
            currency: (_d = dConf === null || dConf === void 0 ? void 0 : dConf.rewardCurrency) !== null && _d !== void 0 ? _d : "USD",
            requiredCompletedRides: (_e = dConf === null || dConf === void 0 ? void 0 : dConf.requiredCompletedTrips) !== null && _e !== void 0 ? _e : 10,
            qualificationPeriod: `${(_f = dConf === null || dConf === void 0 ? void 0 : dConf.qualificationDays) !== null && _f !== void 0 ? _f : 30} days`,
            payoutDelay: `${(_g = dConf === null || dConf === void 0 ? void 0 : dConf.payoutDelayHours) !== null && _g !== void 0 ? _g : 0} hours`,
            rewardPayoutInformation: "Payout is directly processed into your connected Stripe wallet account.",
            shareInstructions: (dConf === null || dConf === void 0 ? void 0 : dConf.shareInstructions) || "Send your unique referral code or link to experienced drivers in your community.",
            termsAndConditions: (dConf === null || dConf === void 0 ? void 0 : dConf.termsAndConditions) || "The referred driver must register with your code and complete the trips within validity period.",
            generalNotes: (dConf === null || dConf === void 0 ? void 0 : dConf.generalNotes) || "Referred drivers must satisfy standard verification protocols.",
        };
    }
    else {
        // default to user rules
        const pConf = (_h = config.referral) === null || _h === void 0 ? void 0 : _h.passenger;
        return {
            enabled: (_j = pConf === null || pConf === void 0 ? void 0 : pConf.enabled) !== null && _j !== void 0 ? _j : true,
            rewardAmount: (_k = pConf === null || pConf === void 0 ? void 0 : pConf.rewardAmount) !== null && _k !== void 0 ? _k : 20,
            currency: (_l = pConf === null || pConf === void 0 ? void 0 : pConf.rewardCurrency) !== null && _l !== void 0 ? _l : "USD",
            qualificationRequirements: `Satisfy qualification via ${(_m = pConf === null || pConf === void 0 ? void 0 : pConf.qualificationType) !== null && _m !== void 0 ? _m : "rides"}.`,
            requiredCompletedTrips: (_o = pConf === null || pConf === void 0 ? void 0 : pConf.requiredCompletedTrips) !== null && _o !== void 0 ? _o : 1,
            qualificationPeriod: `${(_p = pConf === null || pConf === void 0 ? void 0 : pConf.qualificationDays) !== null && _p !== void 0 ? _p : 30} days`,
            maximumRewards: `${(_q = pConf === null || pConf === void 0 ? void 0 : pConf.maximumRewardsPerUser) !== null && _q !== void 0 ? _q : 5} rewards`,
            shareInstructions: (pConf === null || pConf === void 0 ? void 0 : pConf.shareInstructions) || "Share your unique referral code or link with friends who aren't on the platform yet.",
            rewardTerms: (pConf === null || pConf === void 0 ? void 0 : pConf.rewardTerms) || "Once they sign up and complete their qualification rules, you receive the balance.",
            generalNotes: (pConf === null || pConf === void 0 ? void 0 : pConf.generalNotes) || "Referral credits can be spent on ride bookings.",
        };
    }
});
/**
 * Get Passenger Referral Dashboard stats, share details, QR.
 */
const getUserReferralDashboard = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const referralCode = yield getOrCreateReferralCode(userId);
    const config = yield (0, systemConfigHelper_1.getSystemConfig)();
    const pConf = (_a = config.referral) === null || _a === void 0 ? void 0 : _a.passenger;
    const referrals = yield referral_model_1.Referral.find({
        referrerId: userId,
        referralType: "USER",
    });
    const totalInvited = referrals.length;
    const active = referrals.filter((r) => r.status === referral_interface_1.REFERRAL_STATUS.PENDING || r.status === referral_interface_1.REFERRAL_STATUS.ACTIVE || r.status === "joined").length;
    const completed = referrals.filter((r) => r.status === referral_interface_1.REFERRAL_STATUS.COMPLETED).length;
    const totalEarned = referrals
        .filter((r) => r.rewardPaid)
        .reduce((sum, r) => sum + r.rewardAmount, 0);
    const baseClientUrl = config.client_url || "https://alygo.com";
    const shareLink = `${baseClientUrl}/signup?ref=${referralCode}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareLink)}`;
    return {
        reward: (_b = pConf === null || pConf === void 0 ? void 0 : pConf.rewardAmount) !== null && _b !== void 0 ? _b : 20,
        discount: totalEarned, // compatibility
        referralCode,
        shareLink,
        qrCodeUrl,
        statistics: {
            totalInvited,
            active,
            completed,
            totalEarned,
        },
    };
});
/**
 * Get Driver Referral Dashboard stats, share details, QR.
 */
const getDriverReferralDashboard = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const referralCode = yield getOrCreateReferralCode(userId);
    const config = yield (0, systemConfigHelper_1.getSystemConfig)();
    const referrals = yield referral_model_1.Referral.find({
        referrerId: userId,
        referralType: "DRIVER",
    });
    const totalInvited = referrals.length;
    const active = referrals.filter((r) => r.status === referral_interface_1.REFERRAL_STATUS.ACTIVE || r.status === referral_interface_1.REFERRAL_STATUS.PENDING || r.status === "in_progress").length;
    const completed = referrals.filter((r) => r.status === referral_interface_1.REFERRAL_STATUS.COMPLETED).length;
    const pendingRewards = referrals
        .filter((r) => r.status === referral_interface_1.REFERRAL_STATUS.COMPLETED && !r.rewardPaid)
        .reduce((sum, r) => sum + r.rewardAmount, 0);
    const totalEarned = referrals
        .filter((r) => r.rewardPaid)
        .reduce((sum, r) => sum + r.rewardAmount, 0);
    const baseClientUrl = config.client_url || "https://alygo.com";
    const shareLink = `${baseClientUrl}/signup?ref=${referralCode}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareLink)}`;
    return {
        referralCode,
        shareLink,
        qrCodeUrl,
        statistics: {
            totalInvited,
            active,
            completed,
            pendingRewards,
            totalEarned,
        },
    };
});
/**
 * Get referred friends history for Passenger.
 */
const getUserHistory = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const baseQuery = referral_model_1.Referral.find({
        referrerId: userId,
        referralType: "USER",
    }).populate("refereeId", "name profileImage verified createdAt");
    const queryBuilder = new queryBuilder_1.default(baseQuery, query)
        .search(["referralCode"])
        .filter()
        .sort()
        .paginate();
    const result = yield queryBuilder.modelQuery;
    const meta = yield queryBuilder.countTotal();
    const data = result.map((ref) => {
        var _a, _b, _c;
        return ({
            id: ref._id,
            friend: {
                name: ((_a = ref.refereeId) === null || _a === void 0 ? void 0 : _a.name) || "Unknown Friend",
                profileImage: ((_b = ref.refereeId) === null || _b === void 0 ? void 0 : _b.profileImage) || "",
            },
            joinedDate: ((_c = ref.refereeId) === null || _c === void 0 ? void 0 : _c.createdAt) || ref.joinedAt,
            reward: ref.rewardAmount,
            status: ref.status,
        });
    });
    return { data, meta };
});
/**
 * Get referred drivers progress list.
 */
const getDriverProgressList = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const baseQuery = referral_model_1.Referral.find({
        referrerId: userId,
        referralType: "DRIVER",
    }).populate("refereeId", "name profileImage verified createdAt");
    const queryBuilder = new queryBuilder_1.default(baseQuery, query)
        .search(["referralCode"])
        .filter()
        .sort()
        .paginate();
    const result = yield queryBuilder.modelQuery;
    const meta = yield queryBuilder.countTotal();
    const data = result.map((ref) => {
        var _a, _b, _c;
        return ({
            id: ref._id,
            driver: {
                name: ((_a = ref.refereeId) === null || _a === void 0 ? void 0 : _a.name) || "Unknown Driver",
                profileImage: ((_b = ref.refereeId) === null || _b === void 0 ? void 0 : _b.profileImage) || "",
            },
            joinedDate: ((_c = ref.refereeId) === null || _c === void 0 ? void 0 : _c.createdAt) || ref.joinedAt,
            rideProgress: ref.qualificationProgress,
            requiredRideCount: ref.qualificationTarget,
            earnedReward: ref.status === referral_interface_1.REFERRAL_STATUS.COMPLETED ? ref.rewardAmount : 0,
            status: ref.status,
        });
    });
    return { data, meta };
});
/**
 * Get referral rewards payout logs history.
 */
const getRewardPayoutHistory = (userId, role, query) => __awaiter(void 0, void 0, void 0, function* () {
    const referralType = role.toUpperCase() === user_1.USER_ROLES.DRIVER ? "DRIVER" : "USER";
    const baseQuery = referral_model_1.Referral.find({
        referrerId: userId,
        referralType,
        rewardPaid: true,
    }).populate("refereeId", "name profileImage");
    const queryBuilder = new queryBuilder_1.default(baseQuery, query)
        .filter()
        .sort()
        .paginate();
    const result = yield queryBuilder.modelQuery;
    const meta = yield queryBuilder.countTotal();
    const data = result.map((ref) => {
        var _a;
        return ({
            id: ref._id,
            refereeName: ((_a = ref.refereeId) === null || _a === void 0 ? void 0 : _a.name) || "Unknown Referee",
            amount: ref.rewardAmount,
            currency: ref.rewardCurrency,
            date: ref.rewardPaidAt || ref.updatedAt,
            transactionId: ref.rewardTransactionId,
            status: ref.rewardStatus,
        });
    });
    return { data, meta };
});
/**
 * Verify referral code and return referrer info.
 */
const verifyReferralCode = (code) => __awaiter(void 0, void 0, void 0, function* () {
    const cleanCode = code.trim().toUpperCase();
    const referrer = yield user_model_1.User.findOne({ referralCode: cleanCode });
    if (!referrer) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Invalid referral code");
    }
    return {
        isValid: true,
        referrerName: referrer.name,
        referrerRole: referrer.role,
    };
});
exports.ReferralService = {
    getOrCreateReferralCode,
    handleReferralSignup,
    handleDriverRideCompletion,
    checkAndProcessPassengerReferral,
    getRules,
    getUserReferralDashboard,
    getDriverReferralDashboard,
    getUserHistory,
    getDriverProgressList,
    getRewardPayoutHistory,
    verifyReferralCode,
};
