"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tier = void 0;
const mongoose_1 = require("mongoose");
const user_1 = require("../../../enums/user");
const tier_constant_1 = require("./tier.constant");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const destinationFilterSchema = new mongoose_1.Schema(
  {
    enabled: { type: Boolean, default: false },
    dailyLimit: { type: Number, default: 0 },
  },
  { _id: false },
);
const priorityDispatchSchema = new mongoose_1.Schema(
  {
    enabled: { type: Boolean, default: false },
    boostMultiplier: { type: Number, default: 1.0 },
  },
  { _id: false },
);
const reservationAccessSchema = new mongoose_1.Schema(
  {
    enabled: { type: Boolean, default: false },
    maxAdvanceHours: { type: Number, default: 0 },
  },
  { _id: false },
);
const premiumRideAccessSchema = new mongoose_1.Schema(
  {
    enabled: { type: Boolean, default: false },
    allowedCategories: { type: [String], default: [] },
  },
  { _id: false },
);
const airportQueuePrioritySchema = new mongoose_1.Schema(
  {
    enabled: { type: Boolean, default: false },
    priorityPosition: { type: Number, default: 0 },
  },
  { _id: false },
);
const bonusMultiplierSchema = new mongoose_1.Schema(
  {
    enabled: { type: Boolean, default: false },
    multiplierValue: { type: Number, default: 1.0 },
  },
  { _id: false },
);
const vipSupportSchema = new mongoose_1.Schema(
  {
    enabled: { type: Boolean, default: false },
    supportLevel: { type: String, default: "basic" },
  },
  { _id: false },
);
const tierRequirementsSchema = new mongoose_1.Schema(
  {
    tripsRequired: { type: Number, required: true, default: 0 },
    ratingRequired: { type: Number, required: true, default: 0 },
    acceptanceRateRequired: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);
const tierBenefitsSchema = new mongoose_1.Schema(
  {
    destinationFilter: {
      type: destinationFilterSchema,
      default: () => tier_constant_1.DEFAULT_TIER_BENEFITS.destinationFilter,
    },
    priorityDispatch: {
      type: priorityDispatchSchema,
      default: () => tier_constant_1.DEFAULT_TIER_BENEFITS.priorityDispatch,
    },
    reservationAccess: {
      type: reservationAccessSchema,
      default: () => tier_constant_1.DEFAULT_TIER_BENEFITS.reservationAccess,
    },
    premiumRideAccess: {
      type: premiumRideAccessSchema,
      default: () => tier_constant_1.DEFAULT_TIER_BENEFITS.premiumRideAccess,
    },
    airportQueuePriority: {
      type: airportQueuePrioritySchema,
      default: () => tier_constant_1.DEFAULT_TIER_BENEFITS.airportQueuePriority,
    },
    bonusMultiplier: {
      type: bonusMultiplierSchema,
      default: () => tier_constant_1.DEFAULT_TIER_BENEFITS.bonusMultiplier,
    },
    vipSupport: {
      type: vipSupportSchema,
      default: () => tier_constant_1.DEFAULT_TIER_BENEFITS.vipSupport,
    },
  },
  { _id: false },
);
const tierSchema = new mongoose_1.Schema(
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
      default: () => tier_constant_1.DEFAULT_TIER_BENEFITS,
    },
    status: {
      type: String,
      enum: Object.values(user_1.STATUS),
      default: user_1.STATUS.ACTIVE,
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
tierSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.Tier = (0, mongoose_1.model)("Tier", tierSchema);
