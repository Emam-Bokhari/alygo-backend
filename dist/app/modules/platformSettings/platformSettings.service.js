"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformSettingsService = void 0;
const platformSettings_model_1 = require("./platformSettings.model");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
let cachedCurrency = null;
let cacheExpiry = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const getPlatformCurrency = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = Date.now();
    if (cachedCurrency && now < cacheExpiry) {
        return cachedCurrency;
    }
    const settings = yield platformSettings_model_1.PlatformSettings.findOne({});
    const rawCurrency = settings === null || settings === void 0 ? void 0 : settings.currency;
    cachedCurrency = (rawCurrency && rawCurrency.toLowerCase() !== "myr") ? rawCurrency : "usd";
    cacheExpiry = now + CACHE_DURATION_MS;
    return cachedCurrency;
});
const clearPlatformCurrencyCache = () => {
    cachedCurrency = null;
    cacheExpiry = 0;
};
const getPlatformSettingsFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const settings = yield platformSettings_model_1.PlatformSettings.findOne({});
    if (!settings) {
        throw new ApiErrors_1.default(404, "Platform settings not found");
    }
    return settings;
});
const createOrUpdatePlatformSettingsToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    clearPlatformCurrencyCache();
    const existingSettings = yield platformSettings_model_1.PlatformSettings.findOne({});
    if (existingSettings) {
        // Update existing settings
        const updatedSettings = yield platformSettings_model_1.PlatformSettings.findOneAndUpdate({}, payload, {
            new: true,
            runValidators: true,
        });
        if (!updatedSettings) {
            throw new ApiErrors_1.default(400, "Failed to update platform settings");
        }
        return updatedSettings;
    }
    else {
        // Create new settings
        const newSettings = yield platformSettings_model_1.PlatformSettings.create(payload);
        if (!newSettings) {
            throw new ApiErrors_1.default(400, "Failed to create platform settings");
        }
        return newSettings;
    }
});
exports.PlatformSettingsService = {
    getPlatformSettingsFromDB,
    createOrUpdatePlatformSettingsToDB,
    getPlatformCurrency,
    clearPlatformCurrencyCache,
};
