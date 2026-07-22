import { getSystemConfig } from "./systemConfigHelper";

/**
 * Validate GPS coordinates
 */
export const isValidCoordinates = (
  latitude: number,
  longitude: number,
): boolean => {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
};

/**
 * Check if coordinates are duplicates (exactly matching)
 */
export const areCoordinatesDuplicate = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): boolean => {
  return lat1 === lat2 && lon1 === lon2;
};

/**
 * Check if enough time has passed since last update
 */
export const hasMinimumIntervalElapsed = async (
  lastUpdateTime: Date,
  minIntervalSeconds?: number,
): Promise<boolean> => {
  const now = new Date();
  const elapsedMs = now.getTime() - lastUpdateTime.getTime();
  const elapsedSeconds = elapsedMs / 1000;
  const interval =
    minIntervalSeconds ??
    (await getSystemConfig()).tracking.minLocationUpdateIntervalSeconds;
  return elapsedSeconds >= interval;
};

/**
 * Check if driver has moved minimum distance (using simple bounding box to filter GPS jitter)
 */
export const hasMovedMinimumDistance = async (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): Promise<boolean> => {
  // 0.0001 degrees is approximately 11 meters
  const minDelta = 0.0001;
  return Math.abs(lat1 - lat2) >= minDelta || Math.abs(lon1 - lon2) >= minDelta;
};

/**
 * Validate location update before processing
 */
export const validateLocationUpdate = async (params: {
  newLat: number;
  newLon: number;
  oldLat?: number;
  oldLon?: number;
  lastUpdateTime?: Date;
  rideStatus?: string;
}): Promise<{ isValid: boolean; reason?: string }> => {
  const { newLat, newLon, oldLat, oldLon, lastUpdateTime, rideStatus } = params;

  // Validate coordinates
  if (!isValidCoordinates(newLat, newLon)) {
    return { isValid: false, reason: "Invalid GPS coordinates" };
  }

  // Check for inactive ride status
  const inactiveStatuses = [
    "completed",
    "cancelled",
    "cancelled_by_user",
    "cancelled_by_driver",
    "expired",
  ];
  if (rideStatus && inactiveStatuses.includes(rideStatus.toLowerCase())) {
    return { isValid: false, reason: "Ride is not active" };
  }

  // If no previous location, this is valid (first update)
  if (oldLat === undefined || oldLon === undefined) {
    return { isValid: true };
  }

  // Check for duplicate coordinates
  if (areCoordinatesDuplicate(newLat, newLon, oldLat, oldLon)) {
    return { isValid: false, reason: "Duplicate coordinates" };
  }

  // Check minimum movement distance
  if (!(await hasMovedMinimumDistance(newLat, newLon, oldLat, oldLon))) {
    return {
      isValid: false,
      reason: "Movement below minimum distance threshold",
    };
  }

  // Check minimum update interval
  if (lastUpdateTime && !(await hasMinimumIntervalElapsed(lastUpdateTime))) {
    return { isValid: false, reason: "Update interval too short" };
  }

  return { isValid: true };
};

/**
 * Check if ETA should be refreshed based on time interval
 */
export const shouldRefreshETA = async (
  lastETACalculatedAt: Date | null | undefined,
  refreshIntervalSeconds?: number,
): Promise<boolean> => {
  if (!lastETACalculatedAt) {
    return true;
  }
  const now = new Date();
  const elapsedMs = now.getTime() - lastETACalculatedAt.getTime();
  const elapsedSeconds = elapsedMs / 1000;
  const interval =
    refreshIntervalSeconds ??
    (await getSystemConfig()).tracking.etaRefreshIntervalSeconds;
  return elapsedSeconds >= interval;
};
