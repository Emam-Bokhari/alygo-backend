"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformSettings = void 0;
const mongoose_1 = require("mongoose");
const platformSettings_constant_1 = require("./platformSettings.constant");
const platformSettingsSchema = new mongoose_1.Schema(
  {
    platformName: {
      type: String,
      required: true,
      default: "Alygo",
      trim: true,
    },
    currency: {
      type: String,
      enum: Object.values(platformSettings_constant_1.PLATFORM_CURRENCY),
      default: platformSettings_constant_1.PLATFORM_CURRENCY.MYR,
      required: true,
    },
    isMaintenanceMode: {
      type: Boolean,
      default: false,
    },
    supportEmail: {
      type: String,
      trim: true,
      default: "",
    },
    contactNumber: {
      type: String,
      trim: true,
      default: "",
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
exports.PlatformSettings = (0, mongoose_1.model)(
  "PlatformSettings",
  platformSettingsSchema,
);
