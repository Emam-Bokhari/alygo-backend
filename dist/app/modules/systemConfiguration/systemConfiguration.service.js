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
exports.SystemConfigurationService = void 0;
const http_status_codes_1 = require("http-status-codes");
const systemConfiguration_model_1 = require("./systemConfiguration.model");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const systemConfigHelper_1 = require("../../../helpers/systemConfigHelper");
const getDefaultSystemConfig = () => ({
    driverMatching: {
        initialSearchRadiusKm: 5,
        radiusExpansionDistanceKm: 3,
        driverVisibilityDurationSeconds: 60,
        rideRequestLifetimeSeconds: 300,
        maxSearchRadiusKm: 50,
    },
    tracking: {
        minLocationUpdateIntervalSeconds: 2,
        minMovementDistanceMeters: 10,
        maxGpsAccuracyToleranceMeters: 50,
        arrivalRadiusMeters: 30,
        etaRefreshIntervalSeconds: 10,
        averageSpeedKmh: 40,
        enableSocketOptimization: true,
    },
    reservation: {
        enabled: true,
        minAdvanceMinutes: 30,
        maxAdvanceDays: 30,
        driverVisibleBeforeMinutes: 60,
        driverAssignmentTimeoutMinutes: 5,
        reminder24h: true,
        reminder1h: true,
        reminder30m: true,
        reminder15m: true,
    },
    lostFound: {
        enabled: true,
        reportWindowDays: 7,
        maxFiles: 5,
        maxFileSizeMb: 10,
        defaultDeliveryFee: 0,
        returnConfirmationHours: 48,
        autoCloseDays: 30,
    },
    referral: {
        passenger: {
            enabled: true,
            rewardAmount: 20,
            rewardCurrency: "USD",
            qualificationType: "rides",
            requiredCompletedTrips: 1,
            qualificationDays: 30,
            allowMultipleRewards: false,
            maximumRewardsPerUser: 5,
            autoRewardEnabled: true,
            shareInstructions: "Send your unique referral code or link to friends.",
            rewardTerms: "Reward is granted once the referred passenger completes 1 trip.",
            generalNotes: "Referrals are subject to verification.",
        },
        driver: {
            enabled: true,
            rewardAmount: 100,
            rewardCurrency: "USD",
            requiredCompletedTrips: 10,
            qualificationDays: 30,
            payoutDelayHours: 0,
            autoRewardEnabled: true,
            maximumRewardsPerDriver: 10,
            shareInstructions: "Send your unique referral code or link to drivers.",
            termsAndConditions: "The referee driver must complete 10 rides within 30 days.",
            generalNotes: "Payouts are processed within 24 hours.",
        },
    },
    driverRewards: {
        enabled: true,
        tierPromotion: true,
        autoDowngrade: true,
        dailyQuotaResetTime: "00:00",
        timezone: "Asia/Dhaka",
        destinationFilterRadiusDefault: 5,
    },
});
const getSystemConfig = (session) => __awaiter(void 0, void 0, void 0, function* () {
    let config = yield systemConfiguration_model_1.SystemConfiguration.findOne().session(session);
    if (!config) {
        const [newConfig] = yield systemConfiguration_model_1.SystemConfiguration.create([getDefaultSystemConfig()], { session });
        config = newConfig;
    }
    return config;
});
const getSystemConfigurationFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield getSystemConfig();
});
const createOrUpdateSystemConfigurationToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const existingConfig = yield systemConfiguration_model_1.SystemConfiguration.findOne();
    if (existingConfig) {
        const updated = yield systemConfiguration_model_1.SystemConfiguration.findOneAndUpdate({}, payload, {
            new: true,
            runValidators: true,
        });
        if (!updated) {
            throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Failed to update system configuration");
        }
        (0, systemConfigHelper_1.clearSystemConfigCache)();
        return updated;
    }
    else {
        const newConfig = yield systemConfiguration_model_1.SystemConfiguration.create(payload);
        if (!newConfig) {
            throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Failed to create system configuration");
        }
        (0, systemConfigHelper_1.clearSystemConfigCache)();
        return newConfig;
    }
});
exports.SystemConfigurationService = {
    getSystemConfig,
    getSystemConfigurationFromDB,
    createOrUpdateSystemConfigurationToDB,
};
