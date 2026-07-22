"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FareConfiguration = void 0;
const mongoose_1 = require("mongoose");
const status_1 = require("../../../constants/status");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const fareConfigurationSchema = new mongoose_1.Schema(
  {
    serviceAreaId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "ServiceArea",
      required: false,
      index: true,
    },
    serviceCategoryId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: false,
      index: true,
    },
    rideCategoryId: {
      type: mongoose_1.Schema.Types.ObjectId,
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
      enum: Object.values(status_1.STATUS),
      default: status_1.STATUS.ACTIVE,
    },
    createdBy: {
      type: mongoose_1.Schema.Types.ObjectId,
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
fareConfigurationSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.FareConfiguration = (0, mongoose_1.model)(
  "FareConfiguration",
  fareConfigurationSchema,
);
