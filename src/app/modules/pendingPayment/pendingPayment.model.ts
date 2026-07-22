import { Schema, model } from "mongoose";
import {
  IPendingPayment,
  PendingPaymentModel,
} from "./pendingPayment.interface";

const pendingPaymentSchema = new Schema<IPendingPayment, PendingPaymentModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rideId: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const PendingPayment = model<IPendingPayment, PendingPaymentModel>(
  "PendingPayment",
  pendingPaymentSchema,
);
