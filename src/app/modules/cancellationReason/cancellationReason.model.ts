import { Schema, model } from "mongoose";
import {
  type ICancellationReason,
  CancellationReasonModel,
} from "./cancellationReason.interface";
import { CANCELLATION_REASON_USER_TYPE } from "./cancellationReason.constant";
import { STATUS } from "../../../constants/status";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const cancellationReasonSchema = new Schema<ICancellationReason>(
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
      enum: Object.values(CANCELLATION_REASON_USER_TYPE),
      required: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
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

cancellationReasonSchema.plugin(softDeletePlugin);

export const CancellationReason = model<
  ICancellationReason,
  CancellationReasonModel
>("CancellationReason", cancellationReasonSchema);
