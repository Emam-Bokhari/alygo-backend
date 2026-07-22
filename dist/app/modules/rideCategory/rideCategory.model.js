"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideCategory = void 0;
const mongoose_1 = require("mongoose");
const status_1 = require("../../../constants/status");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const vehicleRequirementSchema = new mongoose_1.Schema(
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
const rideCategorySchema = new mongoose_1.Schema(
  {
    serviceCategoryId: {
      type: mongoose_1.Schema.Types.ObjectId,
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
      enum: Object.values(status_1.STATUS),
      default: status_1.STATUS.ACTIVE,
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
      type: mongoose_1.Schema.Types.ObjectId,
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
rideCategorySchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.RideCategory = (0, mongoose_1.model)(
  "RideCategory",
  rideCategorySchema,
);
