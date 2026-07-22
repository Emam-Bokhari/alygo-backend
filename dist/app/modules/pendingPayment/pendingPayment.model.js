"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingPayment = void 0;
const mongoose_1 = require("mongoose");
const pendingPaymentSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    rideId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Ride",
        required: true,
    },
    type: {
        type: String,
        enum: ["cancellation_fee", "driver_appreciation"],
        default: "cancellation_fee",
        required: true,
    },
    driverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Driver",
        required: false,
    },
    amount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "paid", "voided"],
        default: "pending",
        required: true,
    },
    paidWithRideId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Ride",
        required: false,
    },
    driverCompensation: {
        type: Number,
        required: false,
    },
    platformShare: {
        type: Number,
        required: false,
    },
    stripeSessionId: {
        type: String,
        required: false,
    },
    checkoutSessionExpiresAt: {
        type: Date,
        required: false,
    },
    paymentAttemptCount: {
        type: Number,
        required: false,
        default: 0,
    },
}, {
    timestamps: true,
    versionKey: false,
});
exports.PendingPayment = (0, mongoose_1.model)("PendingPayment", pendingPaymentSchema);
