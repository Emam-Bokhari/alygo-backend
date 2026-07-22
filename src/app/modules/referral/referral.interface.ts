import { Model, Types } from "mongoose";

export enum REFERRAL_STATUS {
  JOINED = "joined",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export enum REWARD_STATUS {
  PENDING = "pending",
  PAID = "paid",
}

export interface IReferral {
  referrerId: Types.ObjectId; // Person who shared the code
  refereeId: Types.ObjectId; // Person who joined
  referralCode: string; // Code used to refer
  referrerRole: "user" | "driver"; // Referrer's role at referral time
  status: REFERRAL_STATUS; // joined, in_progress, completed
  ridesCompleted: number; // applicable for driver referee
  rewardAmount: number; // reward amount
  rewardStatus: REWARD_STATUS; // pending, paid
  joinedAt: Date; // Date referee registered
  completedAt?: Date; // Date driver completed 10 rides
  createdAt: Date;
  updatedAt: Date;
}

export type ReferralModel = Model<IReferral>;
