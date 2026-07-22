import { Model, Types } from "mongoose";

export interface IPendingPayment {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  rideId: Types.ObjectId; // The cancelled ride that generated the fee
  type: "cancellation_fee" | "driver_appreciation";
  driverId?: Types.ObjectId;
  amount: number;
  status: "pending" | "paid" | "voided";
  paidWithRideId?: Types.ObjectId; // The ride with which this fee was paid
  driverCompensation?: number; // Amount to be credited to driver's wallet
  platformShare?: number; // Platform's share of the cancellation fee
  stripeSessionId?: string;
  checkoutSessionExpiresAt?: Date;
  paymentAttemptCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PendingPaymentModel = Model<IPendingPayment>;
