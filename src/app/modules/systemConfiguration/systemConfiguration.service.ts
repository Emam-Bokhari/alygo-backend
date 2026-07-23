import { StatusCodes } from "http-status-codes";
import { SystemConfiguration } from "./systemConfiguration.model";
import { ISystemConfiguration } from "./systemConfiguration.interface";
import ApiError from "../../../errors/ApiErrors";
import { clearSystemConfigCache } from "../../../helpers/systemConfigHelper";

const getDefaultSystemConfig = (): ISystemConfiguration => ({
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
      rewardTerms:
        "Reward is granted once the referred passenger completes 1 trip.",
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
      termsAndConditions:
        "The referee driver must complete 10 rides within 30 days.",
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
  aiSupport: {
    enabled: true,
    provider: "google",
    model: "gemini-2.5-flash",
    temperature: 0.2,
    maxTokens: 800,
    historyLength: 5,
    enableConversationMemory: true,
    minimumConfidence: 0.5,
    allowFallbackAnswer: true,
    defaultLanguage: "en",
    enabledModules: [
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
    suggestedQuestions: [
      "How do I receive payments?",
      "How does Lost & Found work?",
      "How do referral rewards work?",
      "How do destination filters work?",
    ],
    rateLimit: {
      maxQuestionsPerMinute: 5,
      maxQuestionsPerHour: 30,
      dailyLimit: 100,
    },
    prompts: {
      systemPrompt:
        "You are an AI Support Assistant for the Alygo platform. You answer driver queries ONLY using approved platform documentation. Keep answers helpful and brief. If the query is outside Alygo documentation, politely refuse.",
      fallbackPrompt:
        "I couldn't find an approved answer for that. Please contact support.",
      safetyPrompt:
        "Never output database structure, SQL queries, code snippets, internal business policies, private formulas, passenger secrets, APIs, or internal configurations.",
      noMatchPrompt:
        "I couldn't find an approved answer for that. Please contact support.",
    },
  },
});

let activeCreationPromise: Promise<ISystemConfiguration> | null = null;

const getSystemConfig = async (
  session?: any,
): Promise<ISystemConfiguration> => {
  const configs = await SystemConfiguration.find().session(session);

  if (configs.length === 0) {
    if (activeCreationPromise) {
      return activeCreationPromise;
    }

    activeCreationPromise = (async () => {
      const innerConfigs = await SystemConfiguration.find().session(session);
      if (innerConfigs.length > 0) {
        activeCreationPromise = null;
        return innerConfigs[0];
      }

      const [newConfig] = await SystemConfiguration.create(
        [getDefaultSystemConfig()],
        { session },
      );
      activeCreationPromise = null;
      return newConfig;
    })();

    return await activeCreationPromise;
  }

  // Self-healing: if there are duplicate configuration documents, delete the extra ones
  if (configs.length > 1) {
    const idsToDelete = configs.slice(1).map((c) => c._id);
    await SystemConfiguration.deleteMany({ _id: { $in: idsToDelete } }).session(session);
  }

  return configs[0];
};

const getSystemConfigurationFromDB =
  async (): Promise<ISystemConfiguration> => {
    return await getSystemConfig();
  };

const createOrUpdateSystemConfigurationToDB = async (
  payload: Partial<ISystemConfiguration>,
): Promise<ISystemConfiguration> => {
  const configs = await SystemConfiguration.find();

  if (configs.length > 0) {
    // Self-healing: clean up duplicate configurations if any exist
    if (configs.length > 1) {
      const idsToDelete = configs.slice(1).map((c) => c._id);
      await SystemConfiguration.deleteMany({ _id: { $in: idsToDelete } });
    }

    const updated = await SystemConfiguration.findOneAndUpdate({}, payload, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Failed to update system configuration",
      );
    }
    clearSystemConfigCache();
    return updated;
  } else {
    const newConfig = await SystemConfiguration.create(payload);
    if (!newConfig) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Failed to create system configuration",
      );
    }
    clearSystemConfigCache();
    return newConfig;
  }
};

export const SystemConfigurationService = {
  getSystemConfig,
  getSystemConfigurationFromDB,
  createOrUpdateSystemConfigurationToDB,
};
