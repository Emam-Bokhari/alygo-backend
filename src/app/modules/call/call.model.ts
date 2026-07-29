import { Schema, model } from "mongoose";
import { ICall, CallModel } from "./call.interface";
import { CALL_STATUS, CALL_TYPE, COMMUNICATION_TYPE } from "./call.constant";

const callSchema = new Schema<ICall, CallModel>(
  {
    rideId: {
      type: Schema.Types.ObjectId,
      ref: "Ride",
      required: false,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    communicationType: {
      type: String,
      enum: Object.values(COMMUNICATION_TYPE),
      required: true,
      index: true,
    },
    channelName: {
      type: String,
      required: true,
      unique: true,
    },
    agoraUidCaller: {
      type: Number,
      required: true,
    },
    agoraUidReceiver: {
      type: Number,
      required: true,
    },
    callerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    callerRole: {
      type: String,
      required: true,
    },
    receiverRole: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(CALL_STATUS),
      default: CALL_STATUS.INITIATED,
      required: true,
      index: true,
    },
    callType: {
      type: String,
      enum: Object.values(CALL_TYPE),
      default: CALL_TYPE.VOICE,
      required: true,
    },
    startedAt: {
      type: Date,
    },
    answeredAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    ringStartedAt: {
      type: Date,
    },
    endedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    endReason: {
      type: String,
    },
    missed: {
      type: Boolean,
      default: false,
    },
    rejected: {
      type: Boolean,
      default: false,
    },
    cancelled: {
      type: Boolean,
      default: false,
    },
    failed: {
      type: Boolean,
      default: false,
    },
    networkQuality: {
      type: String,
    },
    tokenVersion: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Call = model<ICall, CallModel>("Call", callSchema);
