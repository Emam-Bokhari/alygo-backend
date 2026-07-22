"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeakHour = void 0;
const mongoose_1 = require("mongoose");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const status_1 = require("../../../constants/status");
const days_1 = require("../../../constants/days");
const peakHourSchema = new mongoose_1.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    timezone: {
      type: String,
      required: true,
      trim: true,
    },
    applicableDays: {
      type: [String],
      required: true,
      enum: Object.values(days_1.DAYS),
    },
    status: {
      type: String,
      enum: Object.values(status_1.STATUS),
      default: status_1.STATUS.ACTIVE,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
peakHourSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.PeakHour = (0, mongoose_1.model)("PeakHour", peakHourSchema);
