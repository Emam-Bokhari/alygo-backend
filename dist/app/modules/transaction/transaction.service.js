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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const mongoose_1 = require("mongoose");
const transaction_model_1 = require("./transaction.model");
const transaction_constant_1 = require("./transaction.constant");
const user_model_1 = require("../user/user.model");
const ride_constant_1 = require("../ride/ride.constant");
const driver_model_1 = require("../driver/driver.model");
const generateTransactionId = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `TXN-${dateStr}-${randomSuffix}`;
};
const createTransaction = (data, session) => __awaiter(void 0, void 0, void 0, function* () {
    if (!data.transactionId) {
        data.transactionId = generateTransactionId();
    }
    const [transaction] = yield transaction_model_1.Transaction.create([data], { session });
    return transaction;
});
const getTransactionsByUser = (userId_1, role_1, ...args_1) => __awaiter(void 0, [userId_1, role_1, ...args_1], void 0, function* (userId, role, filter = "all") {
    const userObjectId = new mongoose_1.Types.ObjectId(userId);
    // If role is not passed, attempt to retrieve it from User collection
    let userRole = role;
    if (!userRole) {
        const user = yield user_model_1.User.findById(userId);
        userRole = (user === null || user === void 0 ? void 0 : user.role) || "user";
    }
    // Build the base query for User/Driver role
    const query = {
        paymentStatus: { $in: [ride_constant_1.PAYMENT_STATUS.PAID, ride_constant_1.PAYMENT_STATUS.REFUNDED] },
    };
    if (userRole === "driver") {
        const driverProfile = yield driver_model_1.Driver.findOne({ userId: userObjectId });
        if (driverProfile) {
            query.$or = [{ userId: userObjectId }, { driverId: driverProfile._id }];
        }
        else {
            query.userId = userObjectId;
        }
    }
    else {
        // Default to "user" (passenger) logic where transactions belong directly to the passenger
        query.userId = userObjectId;
    }
    // Handle case-insensitive and variant filter values
    let normalizedFilter = "all";
    if (filter) {
        const f = filter.toLowerCase();
        if (f === "add_money" ||
            f === "add-money" ||
            f === "addmoney" ||
            f === "add") {
            normalizedFilter = "add_money";
        }
        else if (f === "spend") {
            normalizedFilter = "spend";
        }
    }
    if (userRole === "driver") {
        if (normalizedFilter === "add_money") {
            query.transactionType = {
                $in: [
                    transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                    transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
                    transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
                    transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP,
                    transaction_constant_1.TRANSACTION_TYPE.REFUND,
                ],
            };
        }
        else if (normalizedFilter === "spend") {
            query.transactionType = {
                $in: [transaction_constant_1.TRANSACTION_TYPE.PAYOUT],
            };
        }
        else {
            // "all"
            query.transactionType = {
                $in: [
                    transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                    transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
                    transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
                    transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP,
                    transaction_constant_1.TRANSACTION_TYPE.REFUND,
                    transaction_constant_1.TRANSACTION_TYPE.PAYOUT,
                ],
            };
        }
    }
    else {
        // Default to "user" (passenger) logic
        if (normalizedFilter === "add_money") {
            query.transactionType = transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP;
        }
        else if (normalizedFilter === "spend") {
            query.transactionType = {
                $in: [
                    transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                    transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_FEE,
                    transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
                ],
            };
        }
        else {
            // "all"
            query.transactionType = {
                $in: [
                    transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP,
                    transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                    transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_FEE,
                    transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
                ],
            };
        }
    }
    const transactions = yield transaction_model_1.Transaction.find(query)
        .sort({ createdAt: -1 })
        .populate("userId bookingId rideId");
    return transactions.map((tx) => {
        const txObj = tx.toObject();
        let flowType = "spend"; // default fallback
        const txType = txObj.transactionType;
        if (txType === transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP ||
            txType === transaction_constant_1.TRANSACTION_TYPE.REFUND ||
            txType === transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_COMPENSATION) {
            flowType = "add_money";
        }
        else if (txType === transaction_constant_1.TRANSACTION_TYPE.PAYOUT) {
            flowType = "spend";
        }
        else if (txType === transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT ||
            txType === transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION ||
            txType === transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_FEE) {
            if (userRole === "driver") {
                flowType = "add_money";
            }
            else {
                flowType = "spend";
            }
        }
        return Object.assign(Object.assign({}, txObj), { type: flowType });
    });
});
exports.TransactionService = {
    createTransaction,
    getTransactionsByUser,
};
