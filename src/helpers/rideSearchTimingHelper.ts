import config from "../config";
import { IRide } from "../app/modules/ride/rider.interface";
import { RIDE_STATUS } from "../app/modules/ride/ride.constant";
import { getSystemConfig } from "./systemConfigHelper";

export interface DriverSearchTiming {
  driverFound: boolean;
  driverFoundInSeconds: number | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  progressPercentage: number;
  isExpired: boolean;
}

/**
 * Calculate driver search timing information for a ride
 * Uses the existing expiration configuration from config.driverMatching.rideRequestLifetimeSeconds
 */
export const calculateDriverSearchTiming = async (
  ride: IRide,
): Promise<DriverSearchTiming> => {
  const now = new Date();
  const requestedAt = new Date(ride.requestedAt);
  const systemConfig = await getSystemConfig();
  const rideRequestLifetimeSeconds =
    systemConfig.driverMatching.rideRequestLifetimeSeconds;

  // Calculate elapsed time in seconds
  const elapsedMs = now.getTime() - requestedAt.getTime();
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  // Calculate remaining time
  const remainingSeconds = Math.max(
    0,
    rideRequestLifetimeSeconds - elapsedSeconds,
  );

  // Calculate progress percentage
  const progressPercentage = Math.min(
    100,
    (elapsedSeconds / rideRequestLifetimeSeconds) * 100,
  );

  // Check if driver was found
  const driverFound = !!ride.driverId;

  // Calculate time taken to find driver (if found)
  let driverFoundInSeconds: number | null = null;
  if (driverFound && ride.acceptedAt) {
    const acceptedAt = new Date(ride.acceptedAt);
    const driverFoundMs = acceptedAt.getTime() - requestedAt.getTime();
    driverFoundInSeconds = Math.floor(driverFoundMs / 1000);
  }

  // Check if ride is expired
  const isExpired =
    ride.status === RIDE_STATUS.EXPIRED ||
    elapsedSeconds >= rideRequestLifetimeSeconds;

  return {
    driverFound,
    driverFoundInSeconds,
    elapsedSeconds,
    remainingSeconds,
    progressPercentage: Math.round(progressPercentage),
    isExpired,
  };
};
