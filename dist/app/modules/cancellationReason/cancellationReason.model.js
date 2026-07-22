"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationReason = void 0;
const mongoose_1 = require("mongoose");
const cancellationReason_constant_1 = require("./cancellationReason.constant");
const status_1 = require("../../../constants/status");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const cancellationReasonSchema = new mongoose_1.Schema(
  {
    reasonName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    userType: {
      type: String,
      enum: Object.values(
        cancellationReason_constant_1.CANCELLATION_REASON_USER_TYPE,
      ),
      required: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(status_1.STATUS),
      default: status_1.STATUS.ACTIVE,
    },
  },
  {
    timestamps: true,
  },
);
// Index for faster filtering
cancellationReasonSchema.index({
  userType: 1,
  status: 1,
  sortOrder: 1,
});
cancellationReasonSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.CancellationReason = (0, mongoose_1.model)(
  "CancellationReason",
  cancellationReasonSchema,
);
