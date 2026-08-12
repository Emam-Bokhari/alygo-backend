import { Schema, model } from "mongoose";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import {
  BackgroundCheckFeeModel,
  IBackgroundCheckFee,
} from "./complianceCenter.interface";
import { FEE_STATUS } from "./complianceCenter.constant";

const backgroundCheckFeeSchema = new Schema<
  IBackgroundCheckFee,
  BackgroundCheckFeeModel
>(
  {
    feeName: {
      type: String,
      required: [true, "Fee name is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    applicableState: {
      type: String,
      trim: true,
      default: "",
    },
    serviceAreaId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceArea",
      default: null,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    status: {
      type: String,
      enum: Object.values(FEE_STATUS),
      default: FEE_STATUS.ACTIVE,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

backgroundCheckFeeSchema.index({ location: "2dsphere" });

// Apply soft delete plugin
backgroundCheckFeeSchema.plugin(softDeletePlugin);

export const BackgroundCheckFee = model<
  IBackgroundCheckFee,
  BackgroundCheckFeeModel
>("BackgroundCheckFee", backgroundCheckFeeSchema);
