import { Model, Types } from "mongoose";
import {
  REPORT_STATUS,
  RECOVERY_METHOD,
  FOUND_STATUS,
  PAYMENT_STATUS,
} from "./lostAndFound.constant";

export interface ILostFoundAuditLog {
  action: string;
  actor: Types.ObjectId;
  actorRole: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface ILostFound {
  _id?: Types.ObjectId;
  rideId: Types.ObjectId;
  passengerId: Types.ObjectId;
  driverId: Types.ObjectId;

  reportNumber: string;

  itemName: string;
  itemCategory: Types.ObjectId;
  itemDescription: string;

  uploadedFiles?: {
    fileUrl: string;
    fileName?: string;
    uploadedAt?: Date;
  }[];

  lastSeenLocation: string;

  reportStatus: REPORT_STATUS;
  foundStatus: FOUND_STATUS;
  recoveryMethod?: RECOVERY_METHOD;

  pickupLocation?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
    address: string;
  };

  deliveryLocation?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
    address: string;
  };

  scheduledAt?: Date;

  deliveryFee: number;
  paymentStatus: PAYMENT_STATUS;

  paymentIntentId?: string;
  paymentTransactionId?: Types.ObjectId | string;
  paymentReference?: string;
  paymentAmount?: number;
  paymentCurrency?: string;

  passengerConfirmed: boolean;
  driverConfirmed: boolean;

  passengerRated: boolean;
  passengerRating?: number;
  passengerReview?: string;

  adminNotes?: string;
  driverNotes?: string;
  createdBy: Types.ObjectId;

  auditLogs: ILostFoundAuditLog[];

  createdAt: Date;
  updatedAt: Date;
}

export type LostFoundModel = Model<ILostFound>;
