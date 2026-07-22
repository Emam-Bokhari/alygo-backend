"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const mongoose_1 = require("mongoose");
const notification_constant_1 = require("./notification.constant");
const notificationSchema = new mongoose_1.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    receiver: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "User",
    },
    referenceId: {
      type: mongoose_1.Schema.Types.ObjectId,
      refPath: "referenceModel",
      required: false,
    },
    referenceModel: {
      type: String,
      required: false,
      enum: ["Car", "Review", "User", "Ride", "Wallet"],
    },
    read: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: Object.values(notification_constant_1.NOTIFICATION_TYPE),
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
exports.Notification = (0, mongoose_1.model)(
  "Notification",
  notificationSchema,
);
