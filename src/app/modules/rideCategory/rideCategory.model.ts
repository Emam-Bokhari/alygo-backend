import { Schema, model } from "mongoose";
import { IRideCategory, RideCategoryModel } from "./rideCategory.interface";
import { STATUS } from "../../../constants/status";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const vehicleRequirementSchema = new Schema(
  {
    vehicleTypes: {
      type: [String],
      required: true,
    },

    minimumSeats: {
      type: Number,
      required: true,
      min: 1,
    },

    luggageCapacity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const rideCategorySchema = new Schema<IRideCategory>(
  {
    serviceCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: false,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    commissionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Driver Requirement
    minimumDriverRating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },

    // Vehicle Rules
    vehicleRequirements: {
      type: vehicleRequirementSchema,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
    },

    supportsReservation: {
      type: Boolean,
      default: true,
    },

    reservationFee: {
      type: Number,
      default: 0,
      min: 0,
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

// Indexes
rideCategorySchema.index({ serviceCategoryId: 1, name: 1 }, { unique: true });
rideCategorySchema.index({ name: 1, status: 1 });

rideCategorySchema.plugin(softDeletePlugin);

export const RideCategory = model<IRideCategory, RideCategoryModel>(
  "RideCategory",
  rideCategorySchema,
);
