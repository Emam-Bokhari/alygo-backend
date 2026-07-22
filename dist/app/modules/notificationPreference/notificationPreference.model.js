"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPreference = void 0;
const mongoose_1 = require("mongoose");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const notificationPreferenceSchema = new mongoose_1.Schema(
  {
    userId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: Boolean,
      default: true,
    },
    push: {
      type: Boolean,
      default: true,
    },
    sms: {
      type: Boolean,
      default: true,
    },
    newRideRequests: {
      type: Boolean,
      default: true,
    },
    rideUpdates: {
      type: Boolean,
      default: true,
    },
    chatMessages: {
      type: Boolean,
      default: true,
    },
    paymentUpdates: {
      type: Boolean,
      default: true,
    },
    promotions: {
      type: Boolean,
      default: true,
    },
    emergencyAlerts: {
      type: Boolean,
      default: true,
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
notificationPreferenceSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.NotificationPreference = (0, mongoose_1.model)(
  "NotificationPreference",
  notificationPreferenceSchema,
);
