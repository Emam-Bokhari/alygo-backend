import { ISoftDeleteModel } from "../../../types/softDelete";
import { Model, Types } from "mongoose";
import {
  BROADCAST_DELIVERY_TYPE,
  BROADCAST_STATUS,
  BROADCAST_TARGET,
  BROADCAST_TYPE,
} from "./broadcast.constant";

export interface IBroadcast {
  deliveryType: BROADCAST_DELIVERY_TYPE;
  title: string;
  message: string;
  type: BROADCAST_TYPE;

  targetAudience: BROADCAST_TARGET;
  targetFilters?: {
    city?: Types.ObjectId;
    state?: Types.ObjectId;
    tier?: Types.ObjectId;
    userIds?: Types.ObjectId[];
  };

  scheduledAt?: Date;
  status: BROADCAST_STATUS;
  sentAt?: Date;

  recipientCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  failureReason?: string;

  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type BroadcastModel = ISoftDeleteModel<IBroadcast>;
