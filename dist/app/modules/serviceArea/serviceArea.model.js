"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceArea = void 0;
const mongoose_1 = require("mongoose");
const serviceArea_constant_1 = require("./serviceArea.constant");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const status_1 = require("../../../constants/status");
const serviceAreaSchema = new mongoose_1.Schema(
  {
    country: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    zone: {
      type: String,
      trim: true,
      default: "",
    },
    airport: {
      type: String,
      trim: true,
      default: "",
    },
    countryId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "ServiceArea",
      default: null,
    },
    stateId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "ServiceArea",
      default: null,
    },
    cityId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "ServiceArea",
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(serviceArea_constant_1.SERVICE_AREA_TYPE),
      required: true,
      index: true,
    },
    maxDrivers: {
      type: Number,
      default: 0,
      min: 0,
    },
    // GeoJSON location for coordinate-based matching
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: false,
        default: [0, 0],
      },
    },
    // Coverage radius in kilometers for this service area
    coverageRadiusKm: {
      type: Number,
      default: 25,
      min: 0,
    },
    // IANA timezone identifier for this service area (e.g., "Asia/Dhaka")
    timezone: {
      type: String,
      trim: true,
      default: "UTC",
    },
    status: {
      type: String,
      enum: Object.values(status_1.STATUS),
      default: status_1.STATUS.ACTIVE,
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
// Useful indexes
serviceAreaSchema.index({
  country: 1,
  state: 1,
  city: 1,
  zone: 1,
  airport: 1,
});
serviceAreaSchema.index({
  type: 1,
  status: 1,
});
// 2dsphere index for geospatial queries on location
serviceAreaSchema.index({ location: "2dsphere" });
serviceAreaSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.ServiceArea = (0, mongoose_1.model)("ServiceArea", serviceAreaSchema);
