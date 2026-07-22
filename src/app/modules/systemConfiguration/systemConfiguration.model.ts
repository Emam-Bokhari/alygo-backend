import { model, Schema } from "mongoose";
import {
  ISystemConfiguration,
  SystemConfigurationModel,
} from "./systemConfiguration.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const driverMatchingSchema = new Schema(
  {
    initialSearchRadiusKm: {
      type: Number,
      required: true,
      min: 0.1,
      default: 5,
    },
    radiusExpansionDistanceKm: {
      type: Number,
      required: true,
      min: 0.1,
      default: 3,
    },
    driverVisibilityDurationSeconds: {
      type: Number,
      required: true,
      min: 10,
      default: 60,
    },
    rideRequestLifetimeSeconds: {
      type: Number,
      required: true,
      min: 60,
      default: 300,
    },
    maxSearchRadiusKm: {
      type: Number,
      required: true,
      min: 1,
      default: 50,
    },
  },
  { _id: false },
);

const trackingSchema = new Schema(
  {
    minLocationUpdateIntervalSeconds: {
      type: Number,
      required: true,
      min: 1,
      default: 2,
    },
    minMovementDistanceMeters: {
      type: Number,
      required: true,
      min: 1,
      default: 10,
    },
    maxGpsAccuracyToleranceMeters: {
      type: Number,
      required: true,
      min: 1,
      default: 50,
    },
    arrivalRadiusMeters: {
      type: Number,
      required: true,
      min: 5,
      default: 30,
    },
    etaRefreshIntervalSeconds: {
      type: Number,
      required: true,
      min: 1,
      default: 10,
    },
    averageSpeedKmh: {
      type: Number,
      required: true,
      min: 1,
      default: 40,
    },
    enableSocketOptimization: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: false },
);

const reservationConfigSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    minAdvanceMinutes: {
      type: Number,
      required: true,
      min: 0,
      default: 30,
    },
    maxAdvanceDays: {
      type: Number,
      required: true,
      min: 1,
      default: 30,
    },
    driverVisibleBeforeMinutes: {
      type: Number,
      required: true,
      min: 0,
      default: 60,
    },
    driverAssignmentTimeoutMinutes: {
      type: Number,
      required: true,
      min: 1,
      default: 5,
    },
    reminder24h: {
      type: Boolean,
      default: true,
    },
    reminder1h: {
      type: Boolean,
      default: true,
    },
    reminder30m: {
      type: Boolean,
      default: true,
    },
    reminder15m: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const lostFoundConfigSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    reportWindowDays: {
      type: Number,
      required: true,
      min: 1,
      default: 7,
    },
    maxFiles: {
      type: Number,
      required: true,
      min: 1,
      default: 5,
    },
    maxFileSizeMb: {
      type: Number,
      required: true,
      min: 1,
      default: 10,
    },
    defaultDeliveryFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    returnConfirmationHours: {
      type: Number,
      required: true,
      min: 1,
      default: 48,
    },
    autoCloseDays: {
      type: Number,
      required: true,
      min: 1,
      default: 30,
    },
  },
  { _id: false },
);

const systemConfigurationSchema = new Schema<
  ISystemConfiguration,
  SystemConfigurationModel
>(
  {
    driverMatching: {
      type: driverMatchingSchema,
      required: true,
    },
    tracking: {
      type: trackingSchema,
      required: true,
    },
    reservation: {
      type: reservationConfigSchema,
      required: false,
    },
    lostFound: {
      type: lostFoundConfigSchema,
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

systemConfigurationSchema.plugin(softDeletePlugin);

export const SystemConfiguration = model<
  ISystemConfiguration,
  SystemConfigurationModel
>("SystemConfiguration", systemConfigurationSchema);
