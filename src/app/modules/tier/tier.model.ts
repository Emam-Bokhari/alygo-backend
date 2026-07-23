import { model, Schema } from "mongoose";
import { STATUS } from "../../../enums/user";
import { DEFAULT_TIER_BENEFITS } from "./tier.constant";
import { ITier, TierModel } from "./tier.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const destinationFilterSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    dailyLimit: { type: Number, default: 0 },
  },
  { _id: false },
);

const priorityDispatchSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    boostMultiplier: { type: Number, default: 1.0 },
  },
  { _id: false },
);

const reservationAccessSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    maxAdvanceHours: { type: Number, default: 0 },
  },
  { _id: false },
);

const premiumRideAccessSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    allowedCategories: { type: [String], default: [] },
  },
  { _id: false },
);

const airportQueuePrioritySchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    priorityPosition: { type: Number, default: 0 },
  },
  { _id: false },
);

const bonusMultiplierSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    multiplierValue: { type: Number, default: 1.0 },
  },
  { _id: false },
);

const vipSupportSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    supportLevel: { type: String, default: "basic" },
  },
  { _id: false },
);

const tierRequirementsSchema = new Schema(
  {
    pointsRequired: { type: Number, required: true, default: 0 },
    tripsRequired: { type: Number, required: true, default: 0 },
    ratingRequired: { type: Number, required: true, default: 0 },
    acceptanceRateRequired: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const tierBenefitsSchema = new Schema(
  {
    destinationFilter: {
      type: destinationFilterSchema,
      default: () => DEFAULT_TIER_BENEFITS.destinationFilter,
    },
    priorityDispatch: {
      type: priorityDispatchSchema,
      default: () => DEFAULT_TIER_BENEFITS.priorityDispatch,
    },
    reservationAccess: {
      type: reservationAccessSchema,
      default: () => DEFAULT_TIER_BENEFITS.reservationAccess,
    },
    premiumRideAccess: {
      type: premiumRideAccessSchema,
      default: () => DEFAULT_TIER_BENEFITS.premiumRideAccess,
    },
    airportQueuePriority: {
      type: airportQueuePrioritySchema,
      default: () => DEFAULT_TIER_BENEFITS.airportQueuePriority,
    },
    bonusMultiplier: {
      type: bonusMultiplierSchema,
      default: () => DEFAULT_TIER_BENEFITS.bonusMultiplier,
    },
    vipSupport: {
      type: vipSupportSchema,
      default: () => DEFAULT_TIER_BENEFITS.vipSupport,
    },
  },
  { _id: false },
);

const tierSchema = new Schema<ITier, TierModel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    level: {
      type: Number,
      required: true,
      unique: true,
    },
    requirements: {
      type: tierRequirementsSchema,
      required: true,
    },
    benefits: {
      type: tierBenefitsSchema,
      required: true,
      default: () => DEFAULT_TIER_BENEFITS,
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

tierSchema.plugin(softDeletePlugin);

export const Tier = model<ITier, TierModel>("Tier", tierSchema);
