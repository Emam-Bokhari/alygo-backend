import { Model, Types } from "mongoose";
import { PAYOUT_STATUS, PAYOUT_METHOD } from "./payout.constant";

export { PAYOUT_STATUS, PAYOUT_METHOD };

export interface IPayout {
  payoutId: string; // Unique payout reference (e.g. PAY-YYYYMMDD-XXXX)
  userId: Types.ObjectId; // User/Driver requesting the payout (ref: User)
  amount: number; // Amount to pay out
  currency: string; // Currency (e.g. USD, BDT)
  status: PAYOUT_STATUS; // Status of the payout
  method: PAYOUT_METHOD; // Payment method used for payout
  destinationAccountId?: string; // Stripe connected account ID or bank account ID
  transactionId?: Types.ObjectId; // Reference to the associated ledger transaction (ref: Transaction)
  failureReason?: string; // Log failure reason if payment fails
  processedAt?: Date; // When payout was completed/processed
  createdAt: Date;
  updatedAt: Date;
}

export type PayoutModel = Model<IPayout>;
