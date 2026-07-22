import { model, Schema } from "mongoose";
import { IEvent, EventModel } from "./event.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { STATUS } from "../../../constants/status";

const eventSchema = new Schema<IEvent>(
  {
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      required: true,
      trim: true,
    },
    startDateTime: {
      type: Date,
      required: true,
    },
    endDateTime: {
      type: Date,
      required: true,
    },
    serviceAreaId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceArea",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: false,
      },
    },
    coverageRadiusKm: {
      type: Number,
      min: 0,
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

eventSchema.index({ location: "2dsphere" });
eventSchema.plugin(softDeletePlugin);

export const Event = model<IEvent, EventModel>("Event", eventSchema);
