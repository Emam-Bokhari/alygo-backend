"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportIssueCategory = void 0;
const mongoose_1 = require("mongoose");
const status_1 = require("../../../constants/status");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const reportIssueCategorySchema = new mongoose_1.Schema(
  {
    issueName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    estimatedResponseTimeInMinutes: {
      type: Number,
      required: true,
      min: 0,
      default: 60, // default 60 minutes
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
reportIssueCategorySchema.index({ status: 1 });
reportIssueCategorySchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.ReportIssueCategory = (0, mongoose_1.model)(
  "ReportIssueCategory",
  reportIssueCategorySchema,
);
