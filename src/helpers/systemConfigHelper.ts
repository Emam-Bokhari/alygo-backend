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
