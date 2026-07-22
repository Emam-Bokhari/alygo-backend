import { model, Schema } from "mongoose";
import {
  IReferral,
  ReferralModel,
  REFERRAL_STATUS,
  REWARD_STATUS,
} from "./referral.interface";

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
      default: REFERRAL_STATUS.JOINED,
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
