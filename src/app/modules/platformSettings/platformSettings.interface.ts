import { Model, Types } from "mongoose";
import { PLATFORM_CURRENCY } from "./platformSettings.constant";

export interface IPlatformSettings {
  platformName: string;
  currency: PLATFORM_CURRENCY;
  isMaintenanceMode: boolean;
  supportEmail?: string;
  contactNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PlatformSettingsModel = Model<IPlatformSettings>;
