import { model, Schema, Types } from "mongoose";
import { POINT_EVENT_TYPE } from "./tier.constant";

export interface IDriverPointHistory {
  driverId: Types.ObjectId;
  rideId?: Types.ObjectId;
  referralId?: Types.ObjectId;
  transactionId?: Types.ObjectId;
  eventType: POINT_EVENT_TYPE;
  source: string;
  points: number;
  balanceAfter: number;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  ruleId?: Types.ObjectId;
  referenceId?: Types.ObjectId;
  action?: "earning" | "deduction";
  previousBalance?: number;
  balanceChange?: number;
  newBalance?: number;
  metadata?: {
    rideId?: Types.ObjectId;
    reportId?: Types.ObjectId;
    referralId?: Types.ObjectId;
    adminId?: Types.ObjectId;
    notes?: string;
    source?: string;
  };
}

const driverPointHistorySchema = new Schema<IDriverPointHistory>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rideId: {
      type: Schema.Types.ObjectId,
      ref: "Ride",
      default: null,
    },
    referralId: {
      type: Schema.Types.ObjectId,
      ref: "Referral",
      default: null,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    eventType: {
      type: String,
      required: true,
      enum: Object.values(POINT_EVENT_TYPE),
    },
    source: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    ruleId: {
      type: Schema.Types.ObjectId,
      ref: "PointRule",
      default: null,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    action: {
      type: String,
      enum: ["earning", "deduction"],
      default: null,
    },
    previousBalance: {
      type: Number,
      default: null,
    },
    balanceChange: {
      type: Number,
      default: null,
    },
    newBalance: {
      type: Number,
      default: null,
    },
    metadata: {
      type: {
        rideId: { type: Schema.Types.ObjectId, ref: "Ride" },
        reportId: { type: Schema.Types.ObjectId, ref: "TripReport" },
        referralId: { type: Schema.Types.ObjectId, ref: "Referral" },
        adminId: { type: Schema.Types.ObjectId, ref: "User" },
        notes: { type: String },
        source: { type: String },
      },
      default: {},
      _id: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

driverPointHistorySchema.index({ driverId: 1, eventType: 1, referenceId: 1 }, { unique: true });

export const DriverPointHistory = model<IDriverPointHistory>(
  "DriverPointHistory",
  driverPointHistorySchema,
);
