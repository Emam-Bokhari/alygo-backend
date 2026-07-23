import { Model, Types } from "mongoose";

export enum REFERRAL_STATUS {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export enum REWARD_STATUS {
  PENDING = "pending",
  PAID = "paid",
}

export interface IReferralAuditLog {
  action: string;
  actor?: Types.ObjectId;
  actorRole?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface IReferral {
  referrerId: Types.ObjectId; // Person who shared the code
  refereeId: Types.ObjectId; // Person who joined
  referralCode: string; // Code used to refer
  referrerRole: "user" | "driver"; // Referrer's role at referral time
  status: REFERRAL_STATUS;
  rewardAmount: number; // reward amount
  rewardStatus: REWARD_STATUS; // pending, paid
  joinedAt: Date; // Date referee registered
  completedAt?: Date; // Date driver completed rides

  // Extended features fields
  referralType: "USER" | "DRIVER";
  referredUserId?: Types.ObjectId;
  referredDriverId?: Types.ObjectId;
  rewardCurrency: string;
  qualificationProgress: number;
  qualificationTarget: number;
  rewardPaid: boolean;
  rewardPaidAt?: Date;
  rewardTransactionId?: Types.ObjectId;
  qualificationCompletedAt?: Date;
  auditLogs: IReferralAuditLog[];

  createdAt: Date;
  updatedAt: Date;
}

export type ReferralModel = Model<IReferral>;
