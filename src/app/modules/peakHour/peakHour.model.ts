import { model, Schema } from "mongoose";
import { IPeakHour, PeakHourModel } from "./peakHour.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { STATUS } from "../../../constants/status";
import { DAYS } from "../../../constants/days";

const peakHourSchema = new Schema<IPeakHour>(
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
      enum: Object.values(DAYS),
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

peakHourSchema.plugin(softDeletePlugin);

export const PeakHour = model<IPeakHour, PeakHourModel>(
  "PeakHour",
  peakHourSchema,
);
