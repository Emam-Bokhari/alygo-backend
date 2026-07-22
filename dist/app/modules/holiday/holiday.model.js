"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Holiday = void 0;
const mongoose_1 = require("mongoose");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const status_1 = require("../../../constants/status");
const holidaySchema = new mongoose_1.Schema(
  {
    holidayName: {
      type: String,
      required: true,
      trim: true,
    },
    timezone: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(status_1.STATUS),
      default: status_1.STATUS.ACTIVE,
    },
    createdBy: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
holidaySchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.Holiday = (0, mongoose_1.model)("Holiday", holidaySchema);
