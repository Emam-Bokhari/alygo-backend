import { model, Schema, Types } from "mongoose";

export interface IDriverPointHistory {
  driverId: Types.ObjectId;
  rideId?: Types.ObjectId;
  referralId?: Types.ObjectId;
  transactionId?: Types.ObjectId;
  eventType: string;
  source: string;
  points: number;
  balanceAfter: number;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const DriverPointHistory = model<IDriverPointHistory>(
  "DriverPointHistory",
  driverPointHistorySchema,
);
