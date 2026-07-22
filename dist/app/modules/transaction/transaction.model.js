"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const mongoose_1 = require("mongoose");
const ride_constant_1 = require("../ride/ride.constant");
const transaction_constant_1 = require("./transaction.constant");
const transactionSchema = new mongoose_1.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    driverId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Driver",
      required: false,
      index: true,
    },
    bookingId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Ride",
      required: false,
      index: true,
    },
    rideId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Ride",
      required: false,
      index: true,
    },
    walletId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Wallet",
      required: false,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      required: false,
    },
    stripeCheckoutSessionId: {
      type: String,
      required: false,
    },
    stripePaymentIntentId: {
      type: String,
      required: false,
    },
    stripeChargeId: {
      type: String,
      required: false,
    },
    stripeTransferId: {
      type: String,
      required: false,
    },
    stripePayoutId: {
      type: String,
      required: false,
    },
    stripeRefundId: {
      type: String,
      required: false,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalFare: {
      type: Number,
      required: false,
    },
    commission: {
      type: Number,
      required: false,
    },
    fee: {
      type: Number,
      required: false,
    },
    currency: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      required: false,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(ride_constant_1.PAYMENT_METHOD),
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(ride_constant_1.PAYMENT_STATUS),
      default: ride_constant_1.PAYMENT_STATUS.PENDING,
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: Object.values(transaction_constant_1.TRANSACTION_TYPE),
      required: true,
      index: true,
    },
    gatewayTransactionId: {
      type: String,
      required: false,
      index: true,
    },
    gatewayResponse: {
      type: mongoose_1.Schema.Types.Mixed,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    metadata: {
      type: mongoose_1.Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
  },
);
exports.Transaction = (0, mongoose_1.model)("Transaction", transactionSchema);
