"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payout = void 0;
const mongoose_1 = require("mongoose");
const payout_interface_1 = require("./payout.interface");
const payoutSchema = new mongoose_1.Schema(
  {
    payoutId: {
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
    },
    status: {
      type: String,
      enum: Object.values(payout_interface_1.PAYOUT_STATUS),
      default: payout_interface_1.PAYOUT_STATUS.PENDING,
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: Object.values(payout_interface_1.PAYOUT_METHOD),
      required: true,
    },
    destinationAccountId: {
      type: String,
      required: false,
    },
    transactionId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Transaction",
      required: false,
      index: true,
    },
    failureReason: {
      type: String,
      required: false,
    },
    processedAt: {
      type: Date,
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
exports.Payout = (0, mongoose_1.model)("Payout", payoutSchema);
