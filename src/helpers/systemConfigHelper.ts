import config from "../config";
import { SystemConfigurationService } from "../app/modules/systemConfiguration/systemConfiguration.service";

let cachedConfig: any = null;
let cacheExpiry: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get system configuration with database values
 * Falls back to .env values if database is unavailable
 */
export const getSystemConfig = async () => {
  const now = Date.now();

  // Return cached config if still valid
  if (cachedConfig && now < cacheExpiry) {
    return cachedConfig;
  }

  try {
    const dbConfig = await SystemConfigurationService.getSystemConfig();

    if (dbConfig) {
      cachedConfig = {
        driverMatching: {
          initialSearchRadiusKm:
            dbConfig.driverMatching?.initialSearchRadiusKm ??
            config.driverMatching.initialSearchRadiusKm,
          radiusExpansionDistanceKm:
            dbConfig.driverMatching?.radiusExpansionDistanceKm ??
            config.driverMatching.radiusExpansionDistanceKm,
          driverVisibilityDurationSeconds:
            dbConfig.driverMatching?.driverVisibilityDurationSeconds ??
            config.driverMatching.driverVisibilityDurationSeconds,
          rideRequestLifetimeSeconds:
            dbConfig.driverMatching?.rideRequestLifetimeSeconds ??
            config.driverMatching.rideRequestLifetimeSeconds,
          maxSearchRadiusKm:
            dbConfig.driverMatching?.maxSearchRadiusKm ??
            config.driverMatching.maxSearchRadiusKm,
        },
        tracking: {
          minLocationUpdateIntervalSeconds:
            dbConfig.tracking?.minLocationUpdateIntervalSeconds ??
            config.tracking.minLocationUpdateIntervalSeconds,
          minMovementDistanceMeters:
            dbConfig.tracking?.minMovementDistanceMeters ??
            config.tracking.minMovementDistanceMeters,
          maxGpsAccuracyToleranceMeters:
            dbConfig.tracking?.maxGpsAccuracyToleranceMeters ??
            config.tracking.maxGpsAccuracyToleranceMeters,
          arrivalRadiusMeters:
            dbConfig.tracking?.arrivalRadiusMeters ??
            config.tracking.arrivalRadiusMeters,
          etaRefreshIntervalSeconds:
            dbConfig.tracking?.etaRefreshIntervalSeconds ??
            config.tracking.etaRefreshIntervalSeconds,
          averageSpeedKmh:
            dbConfig.tracking?.averageSpeedKmh ??
            config.tracking.averageSpeedKmh,
          enableSocketOptimization:
            dbConfig.tracking?.enableSocketOptimization ??
            config.tracking.enableSocketOptimization,
        },
        reservation: {
          enabled: dbConfig.reservation?.enabled ?? config.reservation.enabled,
          minAdvanceMinutes:
            dbConfig.reservation?.minAdvanceMinutes ??
            config.reservation.minAdvanceMinutes,
          maxAdvanceDays:
            dbConfig.reservation?.maxAdvanceDays ??
            config.reservation.maxAdvanceDays,
          driverVisibleBeforeMinutes:
            dbConfig.reservation?.driverVisibleBeforeMinutes ??
            config.reservation.driverVisibleBeforeMinutes,
          driverAssignmentTimeoutMinutes:
            dbConfig.reservation?.driverAssignmentTimeoutMinutes ??
            config.reservation.driverAssignmentTimeoutMinutes,
          reminder24h:
            dbConfig.reservation?.reminder24h ?? config.reservation.reminder24h,
          reminder1h:
            dbConfig.reservation?.reminder1h ?? config.reservation.reminder1h,
          reminder30m:
            dbConfig.reservation?.reminder30m ?? config.reservation.reminder30m,
          reminder15m:
            dbConfig.reservation?.reminder15m ?? config.reservation.reminder15m,
        },
        lostFound: {
          enabled: dbConfig.lostFound?.enabled ?? config.lostFound.enabled,
          reportWindowDays:
            dbConfig.lostFound?.reportWindowDays ??
            config.lostFound.reportWindowDays,
          maxFiles: dbConfig.lostFound?.maxFiles ?? config.lostFound.maxFiles,
          maxFileSizeMb:
            dbConfig.lostFound?.maxFileSizeMb ?? config.lostFound.maxFileSizeMb,
          defaultDeliveryFee:
            dbConfig.lostFound?.defaultDeliveryFee ??
            config.lostFound.defaultDeliveryFee,
          returnConfirmationHours:
            dbConfig.lostFound?.returnConfirmationHours ??
            config.lostFound.returnConfirmationHours,
          autoCloseDays:
            dbConfig.lostFound?.autoCloseDays ?? config.lostFound.autoCloseDays,
        },
        referral: {
          passenger: {
            enabled:
              dbConfig.referral?.passenger?.enabled ??
              config.referral?.passenger?.enabled ??
              true,
            rewardAmount:
              dbConfig.referral?.passenger?.rewardAmount ??
              config.referral?.passenger?.rewardAmount ??
              20,
            rewardCurrency:
              dbConfig.referral?.passenger?.rewardCurrency ??
              config.referral?.passenger?.rewardCurrency ??
              "USD",
            qualificationType:
              dbConfig.referral?.passenger?.qualificationType ??
              config.referral?.passenger?.qualificationType ??
              "rides",
            requiredCompletedTrips:
              dbConfig.referral?.passenger?.requiredCompletedTrips ??
              config.referral?.passenger?.requiredCompletedTrips ??
              1,
            qualificationDays:
              dbConfig.referral?.passenger?.qualificationDays ??
              config.referral?.passenger?.qualificationDays ??
              30,
            allowMultipleRewards:
              dbConfig.referral?.passenger?.allowMultipleRewards ??
              config.referral?.passenger?.allowMultipleRewards ??
              false,
            maximumRewardsPerUser:
              dbConfig.referral?.passenger?.maximumRewardsPerUser ??
              config.referral?.passenger?.maximumRewardsPerUser ??
              5,
            autoRewardEnabled:
              dbConfig.referral?.passenger?.autoRewardEnabled ??
              config.referral?.passenger?.autoRewardEnabled ??
              true,
            shareInstructions:
              dbConfig.referral?.passenger?.shareInstructions ??
              config.referral?.passenger?.shareInstructions ??
              "",
            rewardTerms:
              dbConfig.referral?.passenger?.rewardTerms ??
              config.referral?.passenger?.rewardTerms ??
              "",
            generalNotes:
              dbConfig.referral?.passenger?.generalNotes ??
              config.referral?.passenger?.generalNotes ??
              "",
          },
          driver: {
            enabled:
              dbConfig.referral?.driver?.enabled ??
              config.referral?.driver?.enabled ??
              true,
            rewardAmount:
              dbConfig.referral?.driver?.rewardAmount ??
              config.referral?.driver?.rewardAmount ??
              100,
            rewardCurrency:
              dbConfig.referral?.driver?.rewardCurrency ??
              config.referral?.driver?.rewardCurrency ??
              "USD",
            requiredCompletedTrips:
              dbConfig.referral?.driver?.requiredCompletedTrips ??
              config.referral?.driver?.requiredCompletedTrips ??
              10,
            qualificationDays:
              dbConfig.referral?.driver?.qualificationDays ??
              config.referral?.driver?.qualificationDays ??
              30,
            payoutDelayHours:
              dbConfig.referral?.driver?.payoutDelayHours ??
              config.referral?.driver?.payoutDelayHours ??
              0,
            autoRewardEnabled:
              dbConfig.referral?.driver?.autoRewardEnabled ??
              config.referral?.driver?.autoRewardEnabled ??
              true,
            maximumRewardsPerDriver:
              dbConfig.referral?.driver?.maximumRewardsPerDriver ??
              config.referral?.driver?.maximumRewardsPerDriver ??
              10,
            shareInstructions:
              dbConfig.referral?.driver?.shareInstructions ??
              config.referral?.driver?.shareInstructions ??
              "",
            termsAndConditions:
              dbConfig.referral?.driver?.termsAndConditions ??
              config.referral?.driver?.termsAndConditions ??
              "",
            generalNotes:
              dbConfig.referral?.driver?.generalNotes ??
              config.referral?.driver?.generalNotes ??
              "",
          },
        },
      };
      cacheExpiry = now + CACHE_DURATION_MS;
      return cachedConfig;
    }
  } catch (error) {
    console.warn(
      "Failed to fetch system config from database, using .env fallback:",
      error,
    );
  }

  // Fallback to .env values
  cachedConfig = {
    driverMatching: config.driverMatching,
    tracking: config.tracking,
    reservation: config.reservation,
    lostFound: config.lostFound,
    referral: config.referral,
  };
  cacheExpiry = now + CACHE_DURATION_MS;
  return cachedConfig;
};

/**
 * Clear the configuration cache (call after updating config)
 */
export const clearSystemConfigCache = () => {
  cachedConfig = null;
  cacheExpiry = 0;
};
