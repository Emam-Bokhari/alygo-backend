import { model, Schema } from "mongoose";
import { IHoliday, HolidayModel } from "./holiday.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { STATUS } from "../../../constants/status";

const holidaySchema = new Schema<IHoliday>(
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
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

holidaySchema.plugin(softDeletePlugin);

export const Holiday = model<IHoliday, HolidayModel>("Holiday", holidaySchema);
