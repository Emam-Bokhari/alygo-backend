import { model, Schema } from "mongoose";
import { IServiceArea, ServiceAreaModel } from "./serviceArea.interface";
import { SERVICE_AREA_TYPE, SERVICE_AREA_STATUS } from "./serviceArea.constant";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { STATUS } from "../../../constants/status";

const serviceAreaSchema = new Schema<IServiceArea>(
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

    type: {
      type: String,
      enum: Object.values(SERVICE_AREA_TYPE),
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
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
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

serviceAreaSchema.plugin(softDeletePlugin);

export const ServiceArea = model<IServiceArea, ServiceAreaModel>(
  "ServiceArea",
  serviceAreaSchema,
);
