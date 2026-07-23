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
exports.WalletController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const wallet_service_1 = require("./wallet.service");
const transaction_service_1 = require("../transaction/transaction.service");
const user_model_1 = require("../user/user.model");
const driver_model_1 = require("../driver/driver.model");
const transaction_model_1 = require("../transaction/transaction.model");
const transaction_constant_1 = require("../transaction/transaction.constant");
const ride_constant_1 = require("../ride/ride.constant");
const mongoose_1 = require("mongoose");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
// Passenger (User) Wallet Summary API
const getWalletSummary = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const wallet = yield wallet_service_1.WalletService.getOrCreateWallet(userId);
    const user = (yield user_model_1.User.findById(userId));
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Wallet summary retrieved successfully",
        data: {
            walletBalance: wallet.balance,
            currency: wallet.currency,
            stripeConnected: !!((user === null || user === void 0 ? void 0 : user.stripeCustomerId) || (user === null || user === void 0 ? void 0 : user.stripeConnectedAccountId)),
        },
    });
}));
// Passenger (User) Transaction History API
const getTransactionHistory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const role = req.user.role || "user";
    const { filter, search, page, limit, sortBy, sortOrder, status, startDate, endDate, } = req.query;
    const result = yield transaction_service_1.TransactionService.getTransactions(userId, role, {
        filter: filter,
        search: search,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sortBy: sortBy,
        sortOrder: sortOrder,
        status: status,
        startDate: startDate,
        endDate: endDate,
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Transaction history retrieved successfully",
        data: result,
    });
}));
// Driver Wallet Summary API
const getDriverWalletSummary = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const wallet = yield wallet_service_1.WalletService.getOrCreateWallet(userId);
    const driver = yield driver_model_1.Driver.findOne({ userId });
    if (!driver) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Driver profile not found");
    }
    // Calculate total earnings (sum of completed credits)
    const totalEarningsQuery = {
        paymentStatus: ride_constant_1.PAYMENT_STATUS.PAID,
        transactionType: {
            $in: [
                transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
                transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
                transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
                transaction_constant_1.TRANSACTION_TYPE.DRIVER_REFERRAL_REWARD,
            ],
        },
    };
    totalEarningsQuery.$or = [
        { userId: new mongoose_1.Types.ObjectId(userId) },
        { driverId: driver._id },
    ];
    const totalEarningsResult = yield transaction_model_1.Transaction.aggregate([
        { $match: totalEarningsQuery },
        { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalEarnings = totalEarningsResult.length > 0
        ? parseFloat(totalEarningsResult[0].total.toFixed(2))
        : 0;
    // Calculate pending balance (sum of pending credits)
    const pendingQuery = {
        paymentStatus: ride_constant_1.PAYMENT_STATUS.PENDING,
        transactionType: {
            $in: [
                transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
                transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
                transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
                transaction_constant_1.TRANSACTION_TYPE.DRIVER_REFERRAL_REWARD,
            ],
        },
    };
    pendingQuery.$or = [
        { userId: new mongoose_1.Types.ObjectId(userId) },
        { driverId: driver._id },
    ];
    const pendingResult = yield transaction_model_1.Transaction.aggregate([
        { $match: pendingQuery },
        { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingBalance = pendingResult.length > 0
        ? parseFloat(pendingResult[0].total.toFixed(2))
        : 0;
    const stripeConnected = !!(driver.stripeConnectedAccountId && driver.isStripeOnboarded);
    const canWithdraw = wallet.balance > 0 && stripeConnected;
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Driver wallet summary retrieved successfully",
        data: {
            totalEarnings,
            availableBalance: wallet.balance,
            pendingBalance,
            currency: wallet.currency,
            stripeConnected,
            canWithdraw,
        },
    });
}));
// Driver Transaction History API
const getDriverTransactionHistory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const role = "driver";
    const { filter, search, page, limit, sortBy, sortOrder, status, startDate, endDate, } = req.query;
    const result = yield transaction_service_1.TransactionService.getTransactions(userId, role, {
        filter: filter,
        search: search,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sortBy: sortBy,
        sortOrder: sortOrder,
        status: status,
        startDate: startDate,
        endDate: endDate,
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Driver transaction history retrieved successfully",
        data: result,
    });
}));
// Top-up checkout initiation
const topUpWallet = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { amount } = req.body;
    const result = yield wallet_service_1.WalletService.topUpWallet(userId, Number(amount));
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Wallet top-up checkout session initiated",
        data: result,
    });
}));
exports.WalletController = {
    getWalletSummary,
    getTransactionHistory,
    getDriverWalletSummary,
    getDriverTransactionHistory,
    topUpWallet,
};
