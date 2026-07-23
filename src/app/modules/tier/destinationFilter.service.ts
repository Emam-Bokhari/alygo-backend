import { Types } from "mongoose";
import {
  DestinationFilter,
  IDestinationFilter,
} from "./destinationFilter.model";
import { Driver } from "../driver/driver.model";
import { Tier } from "./tier.model";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import { getDailyResetThreshold } from "./points.controller";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { socketHelper } from "../../../helpers/socketHelper";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { logger } from "../../../shared/logger";

/**
 * Activate a destination filter for a driver
 */
const activateFilter = async (
  driverUserId: string | Types.ObjectId,
  destination: { address: string; coordinates: [number, number] },
  arrivalTimeStr: string | Date,
  radiusKm: number = 5,
): Promise<IDestinationFilter> => {
  const driverId = new Types.ObjectId(driverUserId);
  const now = new Date();

  // 1. Fetch driver profile
  const driver = await Driver.findOne({ userId: driverId }).populate(
    "currentTier",
  );
  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Driver profile not found");
  }

  // 2. Validate online status
  if (driver.driverAvailabilityStatus !== "online") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Driver must be online to activate destination filter",
    );
  }

  // 3. Validate Tier availability
  if (!driver.currentTier) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Driver has no reward tier assigned. Destination filter unavailable.",
    );
  }

  const tier: any = driver.currentTier;
  if (!tier.benefits?.destinationFilter?.enabled) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `Your current tier (${tier.name}) does not unlock the Destination Filter benefit.`,
    );
  }

  // 4. Validate Arrival Time: must be in the future (at least 30 minutes in the future)
  const arrivalTime = new Date(arrivalTimeStr);
  if (isNaN(arrivalTime.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid arrival time format");
  }

  const minFutureTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
  if (arrivalTime.getTime() <= minFutureTime.getTime()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Arrival time must be in the future (minimum 30 minutes from now)",
    );
  }

  // 5. Validate Radius constraints (limit allowed radius between 1km and 15km)
  if (radiusKm < 1 || radiusKm > 15) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Destination filter radius must be between 1 km and 15 km.",
    );
  }

  // 6. Validate only one active filter at a time
  const existingActive = await DestinationFilter.findOne({
    driverId,
    status: "ACTIVE",
  });
  if (existingActive) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "You already have an active destination filter. Cancel it first.",
    );
  }

  // Get driver's service area for timezone-aware date calculations
  const systemConfig = await getSystemConfig();
  const defaultTimezone = systemConfig.driverRewards?.timezone || "Asia/Dhaka";
  let driverTimezone = defaultTimezone;
  if (driver.serviceAreaId) {
    const serviceArea = await ServiceArea.findById(driver.serviceAreaId);
    driverTimezone = serviceArea?.timezone || defaultTimezone;
  }

  // 7. Validate Daily Quota
  const resetThreshold = await getDailyResetThreshold(driverTimezone);
  const activatedTodayCount = await DestinationFilter.countDocuments({
    driverId,
    activatedAt: { $gte: resetThreshold },
  });

  const dailyLimit = tier.benefits.destinationFilter.dailyLimit || 0;
  if (activatedTodayCount >= dailyLimit) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      `Daily destination filter limit reached (${dailyLimit}/${dailyLimit}). Quota resets daily.`,
    );
  }

  // 8. Create and activate filter
  const filterData: Partial<IDestinationFilter> = {
    driverId,
    tierId: tier._id,
    destination: {
      address: destination.address,
      location: {
        type: "Point",
        coordinates: destination.coordinates, // [longitude, latitude]
      },
    },
    coordinates: destination.coordinates,
    arrivalTime,
    radiusKm,
    status: "ACTIVE",
    remainingQuota: Math.max(0, dailyLimit - activatedTodayCount - 1),
    activatedAt: now,
  };

  const [activeFilter] = await DestinationFilter.create([filterData]);

  // 9. Emit socket events
  socketHelper.sendToUser(driverId.toString(), "destination-filter-activated", {
    filterId: activeFilter._id,
    destination: destination.address,
    arrivalTime,
    remainingQuota: activeFilter.remainingQuota,
  });

  socketHelper.sendToUser(
    driverId.toString(),
    "destination-filter-quota-updated",
    {
      remainingQuota: activeFilter.remainingQuota,
      dailyLimit,
    },
  );

  // 10. Send FCM push notification
  sendNotifications({
    receiver: driverId,
    title: "Destination Filter Active 🎯",
    text: `Filter activated toward "${destination.address}" with arrival time ${arrivalTime.toLocaleTimeString()}.`,
    type: NOTIFICATION_TYPE.DRIVER,
  }).catch((err) => logger.error("FCM Notification error:", err.message));

  return activeFilter;
};

/**
 * Cancel an active destination filter for a driver
 */
const cancelFilter = async (
  driverUserId: string | Types.ObjectId,
): Promise<IDestinationFilter> => {
  const driverId = new Types.ObjectId(driverUserId);
  const now = new Date();

  // Find active filter
  const activeFilter = await DestinationFilter.findOne({
    driverId,
    status: "ACTIVE",
  });
  if (!activeFilter) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "No active destination filter found",
    );
  }

  activeFilter.status = "CANCELLED";
  activeFilter.cancelledAt = now;
  await activeFilter.save();

  // Emit sockets
  socketHelper.sendToUser(driverId.toString(), "destination-filter-cancelled", {
    filterId: activeFilter._id,
    destination: activeFilter.destination.address,
    remainingQuota: activeFilter.remainingQuota,
  });

  // Push notifications
  sendNotifications({
    receiver: driverId,
    title: "Destination Filter Cancelled 🛑",
    text: `Your destination filter toward "${activeFilter.destination.address}" was cancelled.`,
    type: NOTIFICATION_TYPE.DRIVER,
  }).catch((err) => logger.error("FCM Notification error:", err.message));

  return activeFilter;
};

/**
 * Retrieve the current filter status details
 */
const getFilterStatus = async (
  driverUserId: string | Types.ObjectId,
): Promise<any> => {
  const driverId = new Types.ObjectId(driverUserId);

  const driver = await Driver.findOne({ userId: driverId }).populate(
    "currentTier",
  );
  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Driver profile not found");
  }

  // Get driver's service area for timezone-aware date calculations
  const systemConfig = await getSystemConfig();
  const defaultTimezone = systemConfig.driverRewards?.timezone || "Asia/Dhaka";
  let driverTimezone = defaultTimezone;
  if (driver.serviceAreaId) {
    const serviceArea = await ServiceArea.findById(driver.serviceAreaId);
    driverTimezone = serviceArea?.timezone || defaultTimezone;
  }

  const resetThreshold = await getDailyResetThreshold(driverTimezone);

  const currentTier: any = driver.currentTier;
  let dailyLimit = 0;
  if (currentTier?.benefits?.destinationFilter?.enabled) {
    dailyLimit = currentTier.benefits.destinationFilter.dailyLimit || 0;
  }

  const activatedToday = await DestinationFilter.countDocuments({
    driverId,
    activatedAt: { $gte: resetThreshold },
  });

  const remainingQuota = Math.max(0, dailyLimit - activatedToday);
  const activeFilter = await DestinationFilter.findOne({
    driverId,
    status: "ACTIVE",
  });

  return {
    remainingToday: remainingQuota,
    dailyLimit,
    activeFilter,
    currentTier: currentTier
      ? {
          _id: currentTier._id,
          name: currentTier.name,
          level: currentTier.level,
        }
      : null,
  };
};

/**
 * Periodic cron job to check and expire filters that have reached arrivalTime or if driver is offline
 */
const expireFilters = async () => {
  const now = new Date();
  try {
    const activeFilters = await DestinationFilter.find({ status: "ACTIVE" });
    let expiredCount = 0;

    for (const filter of activeFilters) {
      const driver = await Driver.findOne({ userId: filter.driverId });

      // Condition A: Arrival time reached
      const isTimeReached = filter.arrivalTime.getTime() <= now.getTime();

      // Condition B: Driver goes offline or breaks
      const isDriverOffline = driver
        ? driver.driverAvailabilityStatus !== "online" &&
          driver.driverAvailabilityStatus !== "on_trip"
        : true;

      if (isTimeReached || isDriverOffline) {
        filter.status = "EXPIRED";
        filter.expiredAt = now;
        await filter.save();

        expiredCount++;

        // Socket notify
        socketHelper.sendToUser(
          filter.driverId.toString(),
          "destination-filter-expired",
          {
            filterId: filter._id,
            reason: isTimeReached
              ? "Arrival time reached"
              : "Driver went offline",
          },
        );

        // FCM notify
        sendNotifications({
          receiver: filter.driverId,
          title: "Destination Filter Expired ⏰",
          text: `Your destination filter toward "${filter.destination.address}" has expired.`,
          type: NOTIFICATION_TYPE.DRIVER,
        }).catch((err) => logger.error("FCM Notification error:", err.message));
      }
    }

    if (expiredCount > 0) {
      logger.info(
        `Expired ${expiredCount} outdated or offline destination filters.`,
      );
    }
  } catch (error: any) {
    logger.error("Error in expireFilters cron check:", error.message);
  }
};

export const DestinationFilterService = {
  activateFilter,
  cancelFilter,
  getFilterStatus,
  expireFilters,
};
