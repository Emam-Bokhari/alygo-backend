"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Referral = void 0;
const mongoose_1 = require("mongoose");
const referral_interface_1 = require("./referral.interface");
const referralAuditLogSchema = new mongoose_1.Schema({
    action: {
        type: String,
        required: true,
    },
    actor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    actorRole: {
        type: String,
        required: false,
    },
    details: {
        type: mongoose_1.Schema.Types.Mixed,
        required: false,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });
const referralSchema = new mongoose_1.Schema({
    referrerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    refereeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
    },
    referralCode: {
        type: String,
        required: true,
        index: true,
    },
    referrerRole: {
        type: String,
        enum: ["user", "driver"],
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(referral_interface_1.REFERRAL_STATUS),
        default: referral_interface_1.REFERRAL_STATUS.PENDING,
    },
    ridesCompleted: {
        type: Number,
        default: 0,
    },
    rewardAmount: {
        type: Number,
        default: 0,
    },
    rewardStatus: {
        type: String,
        enum: Object.values(referral_interface_1.REWARD_STATUS),
        default: referral_interface_1.REWARD_STATUS.PENDING,
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: {
        type: Date,
        required: false,
    },
    // Extended fields
    referralType: {
        type: String,
        enum: ["USER", "DRIVER"],
        required: true,
        default: "USER",
    },
    referredUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    referredDriverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Driver",
        required: false,
    },
    rewardCurrency: {
        type: String,
        required: true,
        default: "USD",
    },
    qualificationProgress: {
        type: Number,
        required: true,
        default: 0,
    },
    qualificationTarget: {
        type: Number,
        required: true,
        default: 0,
    },
    rewardPaid: {
        type: Boolean,
        required: true,
        default: false,
    },
    rewardPaidAt: {
        type: Date,
        required: false,
    },
    rewardTransactionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Transaction",
        required: false,
    },
    qualificationCompletedAt: {
        type: Date,
        required: false,
    },
    auditLogs: {
        type: [referralAuditLogSchema],
        default: [],
    },
}, {
    timestamps: true,
    versionKey: false,
});
exports.Referral = (0, mongoose_1.model)("Referral", referralSchema);
