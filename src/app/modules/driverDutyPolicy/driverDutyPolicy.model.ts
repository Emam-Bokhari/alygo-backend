import { Schema, model, Types } from "mongoose";
import { DRIVER_DUTY_POLICY_SCOPE_TYPE } from "./driverDutyPolicy.constant";
import {
  IDriverDutyPolicy,
  DriverDutyPolicyModel,
} from "./driverDutyPolicy.interface";
import { STATUS } from "../../../constants/status";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const driverDutyPolicySchema = new Schema<IDriverDutyPolicy>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    scopeType: {
      type: String,
      enum: Object.values(DRIVER_DUTY_POLICY_SCOPE_TYPE),
      required: true,
    },

    countryId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceArea",
      default: null,
    },

    stateId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceArea",
      default: null,
    },

    cityId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceArea",
      default: null,
    },

    zoneId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceArea",
      default: null,
    },

    airportId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceArea",
      default: null,
    },

    // Driving Rules
    maxDrivingHoursPerDay: {
      type: Number,
      required: true,
      min: 0,
    },

    maxContinuousDrivingHours: {
      type: Number,
      required: true,
      min: 0,
    },

    breakAfterHours: {
      type: Number,
      required: true,
      min: 0,
    },

    breakDurationMinutes: {
      type: Number,
      required: true,
      min: 0,
    },

    // Trip Rules
    maxTripsPerDay: {
      type: Number,
      min: 0,
    },

    minimumRestHours: {
      type: Number,
      min: 0,
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

driverDutyPolicySchema.plugin(softDeletePlugin);

export const DriverDutyPolicy = model<IDriverDutyPolicy, DriverDutyPolicyModel>(
  "DriverDutyPolicy",
  driverDutyPolicySchema,
);
