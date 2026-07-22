import { model, Schema } from "mongoose";
import {
  FareConfigurationModel,
  IFareConfiguration,
} from "./fareConfiguration.interface";
import { STATUS } from "../../../constants/status";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const fareConfigurationSchema = new Schema<
  IFareConfiguration,
  FareConfigurationModel
>(
  {
    serviceAreaId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceArea",
      required: false,
      index: true,
    },
    serviceCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: false,
      index: true,
    },
    rideCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "RideCategory",
      required: true,
      index: true,
    },
    baseFare: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    perKmFare: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    perMinuteFare: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    waitingFeePerMinute: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minimumFare: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
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

// Compound index to guarantee uniqueness of pricing per Area + Service + Ride category combination
fareConfigurationSchema.index(
  { serviceAreaId: 1, serviceCategoryId: 1, rideCategoryId: 1 },
  { unique: true },
);

fareConfigurationSchema.plugin(softDeletePlugin);

export const FareConfiguration = model<
  IFareConfiguration,
  FareConfigurationModel
>("FareConfiguration", fareConfigurationSchema);
