import { StatusCodes } from "http-status-codes";
import { PlatformSettings } from "./platformSettings.model";
import { IPlatformSettings } from "./platformSettings.interface";
import ApiError from "../../../errors/ApiErrors";

let cachedCurrency: string | null = null;
let cacheExpiry = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const getPlatformCurrency = async (): Promise<string> => {
  const now = Date.now();
  if (cachedCurrency && now < cacheExpiry) {
    return cachedCurrency;
  }
  const settings = await PlatformSettings.findOne({});
  const rawCurrency = settings?.currency;
  cachedCurrency =
    rawCurrency && rawCurrency.toLowerCase() !== "myr" ? rawCurrency : "usd";
  cacheExpiry = now + CACHE_DURATION_MS;
  return cachedCurrency;
};

const clearPlatformCurrencyCache = (): void => {
  cachedCurrency = null;
  cacheExpiry = 0;
};

const getPlatformSettingsFromDB = async (): Promise<IPlatformSettings> => {
  const settings = await PlatformSettings.findOne({});
  if (!settings) {
    throw new ApiError(404, "Platform settings not found");
  }
  return settings;
};

const createOrUpdatePlatformSettingsToDB = async (
  payload: Partial<IPlatformSettings>,
): Promise<IPlatformSettings> => {
  clearPlatformCurrencyCache();
  const existingSettings = await PlatformSettings.findOne({});

  if (existingSettings) {
    // Update existing settings
    const updatedSettings = await PlatformSettings.findOneAndUpdate(
      {},
      payload,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedSettings) {
      throw new ApiError(400, "Failed to update platform settings");
    }

    return updatedSettings;
  } else {
    // Create new settings
    const newSettings = await PlatformSettings.create(payload);
    if (!newSettings) {
      throw new ApiError(400, "Failed to create platform settings");
    }

    return newSettings;
  }
};

export const PlatformSettingsService = {
  getPlatformSettingsFromDB,
  createOrUpdatePlatformSettingsToDB,
  getPlatformCurrency,
  clearPlatformCurrencyCache,
};
