import { model, Schema } from "mongoose";
import {
  IPayout,
  PayoutModel,
  PAYOUT_STATUS,
  PAYOUT_METHOD,
} from "./payout.interface";

const payoutSchema = new Schema<IPayout, PayoutModel>(
  {
    payoutId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
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
      enum: Object.values(PAYOUT_STATUS),
      default: PAYOUT_STATUS.PENDING,
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: Object.values(PAYOUT_METHOD),
      required: true,
    },
    destinationAccountId: {
      type: String,
      required: false,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
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

export const Payout = model<IPayout, PayoutModel>("Payout", payoutSchema);
