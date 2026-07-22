import { model, Schema } from "mongoose";
import {
  IPlatformSettings,
  PlatformSettingsModel,
} from "./platformSettings.interface";
import { PLATFORM_CURRENCY } from "./platformSettings.constant";

const platformSettingsSchema = new Schema<
  IPlatformSettings,
  PlatformSettingsModel
>(
  {
    platformName: {
      type: String,
      required: true,
      default: "Alygo",
      trim: true,
    },
    currency: {
      type: String,
      enum: Object.values(PLATFORM_CURRENCY),
      default: PLATFORM_CURRENCY.MYR,
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

export const PlatformSettings = model<IPlatformSettings, PlatformSettingsModel>(
  "PlatformSettings",
  platformSettingsSchema,
);
