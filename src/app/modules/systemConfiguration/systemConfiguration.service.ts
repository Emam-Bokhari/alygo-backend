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
});

const getSystemConfig = async (
  session?: any,
): Promise<ISystemConfiguration> => {
  let config = await SystemConfiguration.findOne().session(session);
  if (!config) {
    const [newConfig] = await SystemConfiguration.create(
      [getDefaultSystemConfig()],
      { session },
    );
    config = newConfig;
  }
  return config;
};

const getSystemConfigurationFromDB =
  async (): Promise<ISystemConfiguration> => {
    return await getSystemConfig();
  };

const createOrUpdateSystemConfigurationToDB = async (
  payload: Partial<ISystemConfiguration>,
): Promise<ISystemConfiguration> => {
  const existingConfig = await SystemConfiguration.findOne();

  if (existingConfig) {
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
