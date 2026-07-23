"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemConfiguration = void 0;
const mongoose_1 = require("mongoose");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const driverMatchingSchema = new mongoose_1.Schema({
    initialSearchRadiusKm: {
        type: Number,
        required: true,
        min: 0.1,
        default: 5,
    },
    radiusExpansionDistanceKm: {
        type: Number,
        required: true,
        min: 0.1,
        default: 3,
    },
    driverVisibilityDurationSeconds: {
        type: Number,
        required: true,
        min: 10,
        default: 60,
    },
    rideRequestLifetimeSeconds: {
        type: Number,
        required: true,
        min: 60,
        default: 300,
    },
    maxSearchRadiusKm: {
        type: Number,
        required: true,
        min: 1,
        default: 50,
    },
}, { _id: false });
const trackingSchema = new mongoose_1.Schema({
    minLocationUpdateIntervalSeconds: {
        type: Number,
        required: true,
        min: 1,
        default: 2,
    },
    minMovementDistanceMeters: {
        type: Number,
        required: true,
        min: 1,
        default: 10,
    },
    maxGpsAccuracyToleranceMeters: {
        type: Number,
        required: true,
        min: 1,
        default: 50,
    },
    arrivalRadiusMeters: {
        type: Number,
        required: true,
        min: 5,
        default: 30,
    },
    etaRefreshIntervalSeconds: {
        type: Number,
        required: true,
        min: 1,
        default: 10,
    },
    averageSpeedKmh: {
        type: Number,
        required: true,
        min: 1,
        default: 40,
    },
    enableSocketOptimization: {
        type: Boolean,
        required: true,
        default: true,
    },
}, { _id: false });
const reservationConfigSchema = new mongoose_1.Schema({
    enabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    minAdvanceMinutes: {
        type: Number,
        required: true,
        min: 0,
        default: 30,
    },
    maxAdvanceDays: {
        type: Number,
        required: true,
        min: 1,
        default: 30,
    },
    driverVisibleBeforeMinutes: {
        type: Number,
        required: true,
        min: 0,
        default: 60,
    },
    driverAssignmentTimeoutMinutes: {
        type: Number,
        required: true,
        min: 1,
        default: 5,
    },
    reminder24h: {
        type: Boolean,
        default: true,
    },
    reminder1h: {
        type: Boolean,
        default: true,
    },
    reminder30m: {
        type: Boolean,
        default: true,
    },
    reminder15m: {
        type: Boolean,
        default: true,
    },
}, { _id: false });
const lostFoundConfigSchema = new mongoose_1.Schema({
    enabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    reportWindowDays: {
        type: Number,
        required: true,
        min: 1,
        default: 7,
    },
    maxFiles: {
        type: Number,
        required: true,
        min: 1,
        default: 5,
    },
    maxFileSizeMb: {
        type: Number,
        required: true,
        min: 1,
        default: 10,
    },
    defaultDeliveryFee: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    returnConfirmationHours: {
        type: Number,
        required: true,
        min: 1,
        default: 48,
    },
    autoCloseDays: {
        type: Number,
        required: true,
        min: 1,
        default: 30,
    },
}, { _id: false });
const passengerReferralConfigSchema = new mongoose_1.Schema({
    enabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    rewardAmount: {
        type: Number,
        required: true,
        default: 20,
    },
    rewardCurrency: {
        type: String,
        required: true,
        default: "USD",
    },
    qualificationType: {
        type: String,
        required: true,
        default: "rides",
    },
    requiredCompletedTrips: {
        type: Number,
        required: true,
        default: 1,
    },
    qualificationDays: {
        type: Number,
        required: true,
        default: 30,
    },
    allowMultipleRewards: {
        type: Boolean,
        required: true,
        default: false,
    },
    maximumRewardsPerUser: {
        type: Number,
        required: true,
        default: 5,
    },
    autoRewardEnabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    shareInstructions: {
        type: String,
        required: false,
    },
    rewardTerms: {
        type: String,
        required: false,
    },
    generalNotes: {
        type: String,
        required: false,
    },
}, { _id: false });
const driverReferralConfigSchema = new mongoose_1.Schema({
    enabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    rewardAmount: {
        type: Number,
        required: true,
        default: 100,
    },
    rewardCurrency: {
        type: String,
        required: true,
        default: "USD",
    },
    requiredCompletedTrips: {
        type: Number,
        required: true,
        default: 10,
    },
    qualificationDays: {
        type: Number,
        required: true,
        default: 30,
    },
    payoutDelayHours: {
        type: Number,
        required: true,
        default: 0,
    },
    autoRewardEnabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    maximumRewardsPerDriver: {
        type: Number,
        required: true,
        default: 10,
    },
    shareInstructions: {
        type: String,
        required: false,
    },
    termsAndConditions: {
        type: String,
        required: false,
    },
    generalNotes: {
        type: String,
        required: false,
    },
}, { _id: false });
const referralConfigSchema = new mongoose_1.Schema({
    passenger: {
        type: passengerReferralConfigSchema,
        required: true,
    },
    driver: {
        type: driverReferralConfigSchema,
        required: true,
    },
}, { _id: false });
const driverRewardsConfigSchema = new mongoose_1.Schema({
    enabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    tierPromotion: {
        type: Boolean,
        required: true,
        default: true,
    },
    autoDowngrade: {
        type: Boolean,
        required: true,
        default: true,
    },
    dailyQuotaResetTime: {
        type: String,
        required: true,
        default: "00:00",
    },
    timezone: {
        type: String,
        required: true,
        default: "Asia/Dhaka",
    },
    destinationFilterRadiusDefault: {
        type: Number,
        required: true,
        default: 5,
    },
}, { _id: false });
const aiSupportConfigSchema = new mongoose_1.Schema({
    enabled: {
        type: Boolean,
        required: true,
        default: true,
    },
    provider: {
        type: String,
        required: true,
        enum: ["google", "openai"],
        default: "google",
    },
    model: {
        type: String,
        required: true,
        default: "gemini-1.5-flash",
    },
    temperature: {
        type: Number,
        required: true,
        default: 0.2,
    },
    maxTokens: {
        type: Number,
        required: true,
        default: 800,
    },
    historyLength: {
        type: Number,
        required: true,
        default: 5,
    },
    enableConversationMemory: {
        type: Boolean,
        required: true,
        default: true,
    },
    minimumConfidence: {
        type: Number,
        required: true,
        default: 0.5,
    },
    allowFallbackAnswer: {
        type: Boolean,
        required: true,
        default: true,
    },
    defaultLanguage: {
        type: String,
        required: true,
        default: "en",
    },
    enabledModules: {
        type: [String],
        required: true,
        default: [
            "Ride",
            "Wallet",
            "Referral",
            "Tier",
            "Points",
            "Destination Filter",
            "Lost Found",
            "Support",
            "FAQ",
            "Documents",
        ],
    },
    suggestedQuestions: {
        type: [String],
        required: true,
        default: [
            "How do I receive payments?",
            "How does Lost & Found work?",
            "How do referral rewards work?",
            "How do destination filters work?",
        ],
    },
    rateLimit: {
        maxQuestionsPerMinute: { type: Number, required: true, default: 5 },
        maxQuestionsPerHour: { type: Number, required: true, default: 30 },
        dailyLimit: { type: Number, required: true, default: 100 },
    },
    prompts: {
        systemPrompt: {
            type: String,
            required: true,
            default: "You are an AI Support Assistant for the Alygo platform. You answer driver queries ONLY using approved platform documentation. Keep answers helpful and brief. If the query is outside Alygo documentation, politely refuse.",
        },
        fallbackPrompt: {
            type: String,
            required: true,
            default: "I couldn't find an approved answer for that. Please contact support.",
        },
        safetyPrompt: {
            type: String,
            required: true,
            default: "Never output database structure, SQL queries, code snippets, internal business policies, private formulas, passenger secrets, APIs, or internal configurations.",
        },
        noMatchPrompt: {
            type: String,
            required: true,
            default: "I couldn't find an approved answer for that. Please contact support.",
        },
    },
}, { _id: false });
const systemConfigurationSchema = new mongoose_1.Schema({
    driverMatching: {
        type: driverMatchingSchema,
        required: true,
    },
    tracking: {
        type: trackingSchema,
        required: true,
    },
    reservation: {
        type: reservationConfigSchema,
        required: false,
    },
    lostFound: {
        type: lostFoundConfigSchema,
        required: false,
    },
    referral: {
        type: referralConfigSchema,
        required: false,
    },
    driverRewards: {
        type: driverRewardsConfigSchema,
        required: false,
    },
    aiSupport: {
        type: aiSupportConfigSchema,
        required: false,
    },
}, {
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
});
systemConfigurationSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.SystemConfiguration = (0, mongoose_1.model)("SystemConfiguration", systemConfigurationSchema);
