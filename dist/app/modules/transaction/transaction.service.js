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
            query.$or = [
                { userId: userObjectId },
                { driverId: driverProfile._id },
                { driverId: userObjectId },
            ];
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
            f === "add" ||
            f === "add money") {
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
                    transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
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
                    transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
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
                    transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
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
                    transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
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
            txType === transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_FEE ||
            txType === transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY) {
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
const getTransactions = (userId, role, queryOptions) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userObjectId = new mongoose_1.Types.ObjectId(userId);
    const matchQuery = {};
    // 1. Role-based matching logic
    if (role === "driver") {
        const driverProfile = yield driver_model_1.Driver.findOne({ userId: userObjectId });
        if (driverProfile) {
            matchQuery.$or = [
                { userId: userObjectId },
                { driverId: driverProfile._id },
                { driverId: userObjectId },
            ];
        }
        else {
            matchQuery.userId = userObjectId;
        }
    }
    else {
        // Default to user/passenger
        matchQuery.userId = userObjectId;
    }
    // 2. Status filter
    if (queryOptions.status) {
        matchQuery.paymentStatus = queryOptions.status.toLowerCase();
    }
    else {
        matchQuery.paymentStatus = {
            $in: [ride_constant_1.PAYMENT_STATUS.PAID, ride_constant_1.PAYMENT_STATUS.REFUNDED],
        };
    }
    // 3. Filter mapping
    const rawFilter = queryOptions.filter || "all";
    const filter = rawFilter.toLowerCase();
    if (role === "driver") {
        if (filter === "ride_payment") {
            matchQuery.transactionType = transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT;
        }
        else if (filter === "withdrawal") {
            matchQuery.transactionType = transaction_constant_1.TRANSACTION_TYPE.PAYOUT;
        }
        else if (filter === "refund") {
            matchQuery.transactionType = transaction_constant_1.TRANSACTION_TYPE.REFUND;
        }
        else if (filter === "bonus") {
            matchQuery.transactionType = transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION;
        }
        else if (filter === "adjustment") {
            matchQuery.transactionType = transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_COMPENSATION;
        }
        else if (filter === "lost_found" || filter === "lost_found_delivery") {
            matchQuery.transactionType = transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY;
        }
        else {
            // 'all'
            matchQuery.transactionType = {
                $in: [
                    transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                    transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
                    transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
                    transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP,
                    transaction_constant_1.TRANSACTION_TYPE.REFUND,
                    transaction_constant_1.TRANSACTION_TYPE.PAYOUT,
                    transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
                ],
            };
        }
    }
    else {
        // Passenger (User)
        if (filter === "spend") {
            matchQuery.transactionType = {
                $in: [
                    transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                    transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_FEE,
                    transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
                    transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
                ],
            };
        }
        else if (filter === "add_money") {
            matchQuery.transactionType = {
                $in: [transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP, transaction_constant_1.TRANSACTION_TYPE.REFUND],
            };
        }
        else {
            // 'all'
            matchQuery.transactionType = {
                $in: [
                    transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP,
                    transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT,
                    transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_FEE,
                    transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION,
                    transaction_constant_1.TRANSACTION_TYPE.REFUND,
                    transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
                ],
            };
        }
    }
    // 4. Date Range
    if (queryOptions.startDate || queryOptions.endDate) {
        matchQuery.createdAt = {};
        if (queryOptions.startDate) {
            matchQuery.createdAt.$gte = new Date(queryOptions.startDate);
        }
        if (queryOptions.endDate) {
            matchQuery.createdAt.$lte = new Date(queryOptions.endDate);
        }
    }
    // 5. Search
    if (queryOptions.search) {
        const searchRegex = new RegExp(queryOptions.search, "i");
        const orConditions = [{ transactionId: searchRegex }];
        if (mongoose_1.Types.ObjectId.isValid(queryOptions.search)) {
            const searchObjectId = new mongoose_1.Types.ObjectId(queryOptions.search);
            orConditions.push({ _id: searchObjectId }, { rideId: searchObjectId }, { bookingId: searchObjectId });
        }
        // Search by User/Passenger Name or Driver Name
        const matchingUsers = yield user_model_1.User.find({ name: searchRegex }).select("_id");
        const matchingUserIds = matchingUsers.map((u) => u._id);
        if (matchingUserIds.length > 0) {
            orConditions.push({ userId: { $in: matchingUserIds } });
        }
        const matchingDrivers = yield driver_model_1.Driver.find({
            userId: { $in: matchingUserIds },
        }).select("_id");
        const matchingDriverIds = matchingDrivers.map((d) => d._id);
        if (matchingDriverIds.length > 0) {
            orConditions.push({ driverId: { $in: matchingDriverIds } });
        }
        matchQuery.$and = matchQuery.$and || [];
        matchQuery.$and.push({ $or: orConditions });
    }
    // 6. Pagination & Sorting setup
    const page = Number(queryOptions.page) || 1;
    const limit = Number(queryOptions.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = queryOptions.sortBy || "createdAt";
    const sortOrder = ((_a = queryOptions.sortOrder) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortOrder };
    const total = yield transaction_model_1.Transaction.countDocuments(matchQuery);
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    // Execute query with nested population
    const transactions = yield transaction_model_1.Transaction.find(matchQuery)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
        path: "rideId",
        populate: {
            path: "userId",
            select: "name",
        },
    })
        .populate({
        path: "bookingId",
        populate: {
            path: "userId",
            select: "name",
        },
    });
    // Map transactions to standardized structure
    const data = transactions.map((tx) => {
        var _a, _b;
        const txObj = tx.toObject ? tx.toObject() : tx;
        const ridePopulated = txObj.rideId;
        const bookingPopulated = txObj.bookingId;
        const id = txObj._id;
        const transactionId = txObj.transactionId;
        const createdAt = txObj.createdAt;
        const currency = txObj.currency || "USD";
        // Subtitle formatting
        const dateObj = new Date(createdAt);
        const optionsDate = {
            month: "short",
            day: "numeric",
            year: "numeric",
        };
        const optionsTime = {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        };
        const dStr = dateObj.toLocaleDateString("en-US", optionsDate);
        const tStr = dateObj.toLocaleTimeString("en-US", optionsTime);
        const subtitle = `${dStr} • ${tStr}`;
        // Status mapping
        let status = "success";
        if (txObj.paymentStatus === ride_constant_1.PAYMENT_STATUS.PENDING) {
            status = "pending";
        }
        else if (txObj.paymentStatus === ride_constant_1.PAYMENT_STATUS.FAILED) {
            status = "failed";
        }
        else if (txObj.paymentStatus === ride_constant_1.PAYMENT_STATUS.REFUNDED) {
            status = "refunded";
        }
        if (role === "driver") {
            let amount = txObj.amount;
            let transactionType = "RIDE_PAYMENT";
            let title = "Ride Payment";
            let icon = "car";
            let displayColor = "green";
            const txType = txObj.transactionType;
            let passengerName = "Passenger";
            if (ridePopulated &&
                ridePopulated.userId &&
                typeof ridePopulated.userId === "object") {
                passengerName = ridePopulated.userId.name || "Passenger";
            }
            else if (bookingPopulated &&
                bookingPopulated.userId &&
                typeof bookingPopulated.userId === "object") {
                passengerName = bookingPopulated.userId.name || "Passenger";
            }
            if (txType === transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT) {
                transactionType = "RIDE_PAYMENT";
                title = `Payment from ${passengerName}`;
                icon = "car";
                displayColor = "green";
                amount = txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.PAYOUT) {
                transactionType = "WITHDRAWAL";
                title = "Stripe Payout";
                icon = "arrow-up-right";
                displayColor = "red";
                amount = -txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.REFUND) {
                transactionType = "REFUND";
                title = `Refund to ${passengerName}`;
                icon = "arrow-down-left";
                displayColor = "green";
                amount = txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION) {
                transactionType = "BONUS";
                title = `Bonus Tip from ${passengerName}`;
                icon = "gift";
                displayColor = "green";
                amount = txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_COMPENSATION) {
                transactionType = "ADJUSTMENT";
                title = "Cancellation Compensation";
                icon = "shield-alert";
                displayColor = "green";
                amount = txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP) {
                transactionType = "TOPUP";
                title = "Wallet Top-up";
                icon = "plus";
                displayColor = "green";
                amount = txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY) {
                transactionType = "LOST_FOUND_DELIVERY";
                title = `Lost & Found Delivery from ${passengerName}`;
                icon = "package";
                displayColor = "green";
                amount = txObj.amount;
            }
            else {
                transactionType = "RIDE_PAYMENT";
                title = txObj.description || "Ride Payment";
                icon = "car";
                displayColor = "green";
                amount = txObj.amount;
            }
            const rideIdStr = ridePopulated
                ? ridePopulated._id.toString()
                : bookingPopulated
                    ? bookingPopulated._id.toString()
                    : null;
            const rideCode = rideIdStr
                ? `Ride #${rideIdStr.slice(-6).toUpperCase()}`
                : subtitle;
            return {
                id,
                transactionId,
                type: amount < 0 ? "SPEND" : "ADD_MONEY",
                title,
                subtitle: rideCode,
                amount,
                currency,
                status,
                transactionType,
                icon,
                displayColor,
                createdAt,
                actions: {
                    canView: true,
                    canDelete: false,
                },
            };
        }
        else {
            // Passenger mapping
            let amount = txObj.amount;
            let type = "SPEND";
            let title = "Ride Payment";
            let icon = "minus";
            let displayColor = "red";
            const txType = txObj.transactionType;
            if (txType === transaction_constant_1.TRANSACTION_TYPE.WALLET_TOPUP) {
                type = "ADD_MONEY";
                title = "Added to Wallet";
                icon = "plus";
                displayColor = "green";
                amount = txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.REFUND) {
                type = "ADD_MONEY";
                title = "Refund Credited";
                icon = "plus";
                displayColor = "green";
                amount = txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_COMPENSATION) {
                type = "ADD_MONEY";
                title = "Cancellation Compensation";
                icon = "plus";
                displayColor = "green";
                amount = txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.LOST_FOUND_DELIVERY) {
                type = "SPEND";
                title = "Lost & Found Delivery";
                icon = "package";
                displayColor = "red";
                amount = -txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.BOOKING_PAYMENT) {
                type = "SPEND";
                title = ((_a = ridePopulated === null || ridePopulated === void 0 ? void 0 : ridePopulated.destination) === null || _a === void 0 ? void 0 : _a.address)
                    ? `Ride to ${ridePopulated.destination.address}`
                    : ((_b = bookingPopulated === null || bookingPopulated === void 0 ? void 0 : bookingPopulated.destination) === null || _b === void 0 ? void 0 : _b.address)
                        ? `Ride to ${bookingPopulated.destination.address}`
                        : "Ride Payment";
                icon = "minus";
                displayColor = "red";
                amount = -txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.CANCELLATION_FEE) {
                type = "SPEND";
                title = "Cancellation Fee";
                icon = "minus";
                displayColor = "red";
                amount = -txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.DRIVER_APPRECIATION) {
                type = "SPEND";
                title = "Driver Tip";
                icon = "minus";
                displayColor = "red";
                amount = -txObj.amount;
            }
            else if (txType === transaction_constant_1.TRANSACTION_TYPE.PAYOUT) {
                type = "SPEND";
                title = "Withdrawal";
                icon = "minus";
                displayColor = "red";
                amount = -txObj.amount;
            }
            else {
                type = "SPEND";
                title = txObj.description || "Ride Payment";
                icon = "minus";
                displayColor = "red";
                amount = -txObj.amount;
            }
            return {
                id,
                transactionId,
                type,
                title,
                subtitle,
                status,
                amount,
                currency,
                icon,
                displayColor,
                createdAt,
            };
        }
    });
    return {
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage,
            hasPrevPage,
        },
        data,
    };
});
exports.TransactionService = {
    createTransaction,
    getTransactionsByUser,
    getTransactions,
};
