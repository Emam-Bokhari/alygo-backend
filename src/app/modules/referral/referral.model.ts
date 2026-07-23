import { model, Schema } from "mongoose";
import {
  IReferral,
  ReferralModel,
  REFERRAL_STATUS,
  REWARD_STATUS,
} from "./referral.interface";

const referralAuditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    actorRole: {
      type: String,
      required: false,
    },
    details: {
      type: Schema.Types.Mixed,
      required: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const referralSchema = new Schema<IReferral, ReferralModel>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refereeId: {
      type: Schema.Types.ObjectId,
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
      enum: Object.values(REFERRAL_STATUS),
      default: REFERRAL_STATUS.PENDING,
    },
    rewardAmount: {
      type: Number,
      default: 0,
    },
    rewardStatus: {
      type: String,
      enum: Object.values(REWARD_STATUS),
      default: REWARD_STATUS.PENDING,
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
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    referredDriverId: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Referral = model<IReferral, ReferralModel>(
  "Referral",
  referralSchema,
);

