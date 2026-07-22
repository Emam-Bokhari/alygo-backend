"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Referral = void 0;
const mongoose_1 = require("mongoose");
const referral_interface_1 = require("./referral.interface");
const referralSchema = new mongoose_1.Schema(
  {
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
      default: referral_interface_1.REFERRAL_STATUS.JOINED,
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
exports.Referral = (0, mongoose_1.model)("Referral", referralSchema);
