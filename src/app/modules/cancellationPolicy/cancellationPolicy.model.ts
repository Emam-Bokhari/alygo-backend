import { model, Schema } from "mongoose";
import {
  ICancellationPolicy,
  CancellationPolicyModel,
} from "./cancellationPolicy.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const passengerScenarioSchema = new Schema(
  {
    cancellationFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    platformShare: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    driverCompensation: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false },
);

const driverScenarioSchema = new Schema(
  {
    cancellationFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    platformShare: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false },
);

const cancellationPolicySchema = new Schema<
  ICancellationPolicy,
  CancellationPolicyModel
>(
  {
    passenger: {
      beforeDriverAccepted: {
        type: passengerScenarioSchema,
        required: true,
      },
      afterDriverAccepted: {
        type: passengerScenarioSchema,
        required: true,
      },
      afterDriverArrived: {
        type: passengerScenarioSchema,
        required: true,
      },
    },
    driver: {
      afterAccept: {
        type: driverScenarioSchema,
        required: true,
      },
      excessiveCancellation: {
        type: driverScenarioSchema,
        required: true,
      },
      excessiveCancellationThreshold: {
        type: Number,
        required: true,
        default: 3,
      },
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

cancellationPolicySchema.plugin(softDeletePlugin);

export const CancellationPolicy = model<
  ICancellationPolicy,
  CancellationPolicyModel
>("CancellationPolicy", cancellationPolicySchema);
