import { ISoftDeleteModel } from "../../../types/softDelete";
import { Model, Types } from "mongoose";
import { CALL_STATUS, CALL_TYPE, COMMUNICATION_TYPE } from "./call.constant";

export interface ICall {
  rideId?: Types.ObjectId;
  referenceId: Types.ObjectId;
  communicationType: COMMUNICATION_TYPE;
  channelName: string;
  agoraUidCaller: number;
  agoraUidReceiver: number;
  callerId: Types.ObjectId;
  receiverId: Types.ObjectId;
  callerRole: string;
  receiverRole: string;
  status: CALL_STATUS;
  callType: CALL_TYPE;
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  durationSeconds?: number;
  ringStartedAt?: Date;
  endedBy?: Types.ObjectId;
  endReason?: string;
  missed?: boolean;
  rejected?: boolean;
  cancelled?: boolean;
  failed?: boolean;
  networkQuality?: string;
  tokenVersion?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type CallModel = ISoftDeleteModel<ICall>;
