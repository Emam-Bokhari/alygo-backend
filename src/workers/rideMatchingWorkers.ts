import { Worker, Job } from "bullmq";
import { DateTime } from "luxon";
import { Ride } from "../app/modules/ride/ride.model";
import {
  RIDE_STATUS,
  CANCELLED_BY,
  RIDE_TYPE,
} from "../app/modules/ride/ride.constant";
import { rideDriverSocketHelper } from "../app/modules/ride/socket/driver.socket";
import { rideUserSocketHelper } from "../app/modules/ride/socket/user.socket";
import {
  getNearbyDriversDetails,
  PassengerSummary,
} from "../app/modules/ride/helpers/buildRideParticipantSummary";
import { logger } from "../shared/logger";
import { calculateDriverSearchTiming } from "../helpers/rideSearchTimingHelper";
import { getRideScheduleInfo } from "../shared/timezoneHelper";
import {
  rideExpirationQueue,
  driverVisibilityQueue,
  radiusExpansionQueue,
  driverAvailabilityCheckQueue,
  QUEUE_NAMES,
  connectionOptions,
  RideExpirationJobData,
  DriverVisibilityJobData,
  RadiusExpansionJobData,
  DriverAvailabilityCheckJobData,
} from "../config/bullmq";
import { getSystemConfig } from "../helpers/systemConfigHelper";
import config from "../config";
import { Driver } from "../app/modules/driver/driver.model";
import { DriverDutyPolicyServices } from "../app/modules/driverDutyPolicy/driverDutyPolicy.service";
import { DestinationFilterService } from "../app/modules/tier/destinationFilter.service";
import { PointsService } from "../app/modules/tier/points.service";
import { driverRewardsQueue } from "../config/bullmq";
import { sendNotifications } from "../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../app/modules/notification/notification.constant";

// Import the triggerImmediateRadiusExpansion function from ride service
// We need to dynamically import it to avoid circular dependency
let triggerImmediateRadiusExpansion: any = null;

const getTriggerFunction = async () => {
  if (!triggerImmediateRadiusExpansion) {
    const rideService = await import("../app/modules/ride/ride.service");
    triggerImmediateRadiusExpansion =
      rideService.RideServices.triggerImmediateRadiusExpansion;
  }
  return triggerImmediateRadiusExpansion;
};

/**
 * Worker to handle ride request expiration (5-minute lifetime)
 */
const rideExpirationWorker = new Worker(
  QUEUE_NAMES.RIDE_EXPIRATION,
  async (job: Job<RideExpirationJobData>) => {
    const { rideId, userId } = job.data;

    try {
      const ride = await Ride.findOne({
        _id: rideId,
        status: RIDE_STATUS.SEARCHING_DRIVER,
      });

      if (!ride) {
        logger.info(
          `Ride ${rideId} already accepted or cancelled, skipping expiration`,
        );
        return;
      }

      // Update ride status to EXPIRED
      ride.status = RIDE_STATUS.EXPIRED;
      ride.cancellation = {
        cancelledBy: CANCELLED_BY.ADMIN,
        cancellationReasonName:
          "Ride request expired. No driver accepted within the maximum time limit.",
        cancellationFee: 0,
        driverCompensation: 0,
        platformShare: 0,
        cancelledAt: new Date(),
      };
      await ride.save();

      // Calculate driver search timing for notification
      const driverSearchTiming = await calculateDriverSearchTiming(ride);

      // Notify user
      rideUserSocketHelper.emitRideExpired(userId, {
        rideId: ride._id,
        message: "Request expired. No driver found within the time limit.",
        driverSearch: driverSearchTiming,
      });

      logger.info(`Ride ${rideId} expired after 5 minutes`);
    } catch (error: any) {
      logger.error(
        `Error processing ride expiration for ride ${rideId}:`,
        error.message,
      );
      throw error;
    }
  },
  {
    connection: connectionOptions,
    concurrency: 5,
  },
);

/**
 * Worker to handle driver visibility timeout (60 seconds per driver)
 */
const driverVisibilityWorker = new Worker(
  QUEUE_NAMES.DRIVER_VISIBILITY,
  async (job: Job<DriverVisibilityJobData>) => {
    const { rideId, driverId, userId } = job.data;

    try {
      const ride = await Ride.findOne({
        _id: rideId,
        status: RIDE_STATUS.SEARCHING_DRIVER,
      });

      if (!ride) {
        logger.info(
          `Ride ${rideId} already accepted or cancelled, skipping driver visibility timeout`,
        );
        return;
      }

      // Update the driver's notification status to EXPIRED
      const driverNotification = ride.driverMatching.notifiedDrivers.find(
        (d) => d.driverId.toString() === driverId,
      );

      if (driverNotification && driverNotification.status === "sent") {
        driverNotification.status = "expired" as any;
        driverNotification.respondedAt = new Date();
        await ride.save();

        // Calculate driver search timing for notification
        const driverSearchTiming = await calculateDriverSearchTiming(ride);

        // Notify driver to remove the request from their screen
        rideDriverSocketHelper.emitRideRequestExpired(driverId, {
          rideId: ride._id,
          driverSearch: driverSearchTiming,
        });

        logger.info(`Driver ${driverId} visibility expired for ride ${rideId}`);

        // Check if all drivers have now responded (accepted, rejected, or expired)
        const allDriversResponded = ride.driverMatching.notifiedDrivers.every(
          (d) => d.status !== "sent",
        );

        // If all drivers have responded and no one accepted, trigger immediate radius expansion
        if (
          allDriversResponded &&
          ride.status === RIDE_STATUS.SEARCHING_DRIVER
        ) {
          const triggerFunc = await getTriggerFunction();
          await triggerFunc(ride);
        }
      }
    } catch (error: any) {
      logger.error(
        `Error processing driver visibility for driver ${driverId}:`,
        error.message,
      );
      throw error;
    }
  },
  {
    connection: connectionOptions,
    concurrency: 10,
  },
);

/**
 * Worker to handle progressive radius expansion
 */
const radiusExpansionWorker = new Worker(
  QUEUE_NAMES.RADIUS_EXPANSION,
  async (job: Job<RadiusExpansionJobData>) => {
    const {
      rideId,
      userId,
      pickupLocation,
      currentRadiusKm,
      rideCategoryId,
      serviceCategoryId,
      expansionCount,
    } = job.data;

    try {
      const ride = await Ride.findOne({
        _id: rideId,
        status: RIDE_STATUS.SEARCHING_DRIVER,
      });

      if (!ride) {
        logger.info(
          `Ride ${rideId} already accepted or cancelled, skipping radius expansion`,
        );
        return;
      }

      // Check if we've reached the maximum radius
      const systemConfig = await getSystemConfig();
      const maxRadius = systemConfig.driverMatching.maxSearchRadiusKm;
      if (currentRadiusKm >= maxRadius) {
        logger.info(
          `Ride ${rideId} reached maximum search radius, stopping expansion`,
        );
        return;
      }

      // Calculate new radius
      const newRadius =
        currentRadiusKm + systemConfig.driverMatching.radiusExpansionDistanceKm;

      // Import and call the driver matching function
      const { findEligibleDriversInRadius } =
        await import("../services/driverMatchingService");

      const newDrivers = await findEligibleDriversInRadius({
        pickupLocation,
        radiusKm: newRadius,
        rideCategoryId,
        serviceCategoryId,
        excludeDriverIds: ride.driverMatching.notifiedDrivers.map((d) =>
          d.driverId.toString(),
        ),
        rideServiceAreaId: ride.serviceAreaId?.toString(),
        rideDestination: ride.destination.location,
        rideType: ride.rideType,
        scheduledAt: ride.scheduledAt,
      });

      if (newDrivers.length === 0) {
        logger.info(
          `No new drivers found in expanded radius ${newRadius}km for ride ${rideId}`,
        );

        // If no drivers found and we haven't reached max radius, schedule next expansion with delay
        if (newRadius < maxRadius) {
          const nextRadius =
            newRadius + systemConfig.driverMatching.radiusExpansionDistanceKm;
          await radiusExpansionQueue.add(
            `radius-expansion-${rideId}`,
            {
              rideId,
              userId,
              pickupLocation,
              currentRadiusKm: newRadius,
              rideCategoryId,
              serviceCategoryId,
              expansionCount: expansionCount + 1,
            },
            {
              jobId: `radius-expansion-${rideId}-${expansionCount + 1}`,
              delay:
                systemConfig.driverMatching.driverVisibilityDurationSeconds *
                1000,
            },
          );
          logger.info(
            `Scheduled next radius expansion to ${nextRadius}km for ride ${rideId}`,
          );
        }
        return;
      }

      // Add new drivers to the ride's notified drivers list
      const newDriverNotifications = newDrivers.map((driver: any) => ({
        driverId: driver.driverId,
        sentAt: new Date(),
        status: "sent" as any,
      }));

      ride.driverMatching.notifiedDrivers.push(...newDriverNotifications);
      ride.driverMatching.searchRadiusKm = newRadius;
      await ride.save();

      // Get and emit newly matching drivers details to the passenger via Socket.io
      try {
        const newDriversDetails = await getNearbyDriversDetails(newDrivers);
        rideUserSocketHelper.emitNearbyDriversFound(userId, {
          rideId: ride._id.toString(),
          drivers: newDriversDetails,
          isExpansion: true,
        });
      } catch (err) {
        logger.error(
          `[RideMatchingWorker] Error emitting nearby drivers during expansion to user: ${err}`,
        );
      }

      // Calculate driver search timing for notifications
      const driverSearchTiming = await calculateDriverSearchTiming(ride);

      // Build passenger summary for new drivers
      let passengerSummary: PassengerSummary | undefined;
      try {
        const { User } = await import("../app/modules/user/user.model");
        const { buildPassengerSummary } =
          await import("../app/modules/ride/helpers/buildRideParticipantSummary");
        const userDoc = await User.findById(ride.userId).select(
          "name profileImage averageRating totalRatings",
        );
        passengerSummary = buildPassengerSummary(userDoc);
      } catch (err) {
        logger.error(
          `[RideMatchingWorker] Error building passenger summary: ${err}`,
        );
      }

      const startTime = new Date();
      const isReservation = ride.rideType === RIDE_TYPE.SCHEDULED;
      const visibilityDurationSeconds = isReservation
        ? systemConfig.driverMatching.reservationDriverVisibilityDurationSeconds
        : systemConfig.driverMatching.driverVisibilityDurationSeconds;
      const endTime = new Date(
        startTime.getTime() + visibilityDurationSeconds * 1000,
      );

      // Send requests to new drivers via socket
      newDrivers.forEach((driver: any) => {
        const payload = {
          rideId: ride._id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          timeoutSeconds: visibilityDurationSeconds,
          user: passengerSummary,
          ...getRideScheduleInfo(ride),
          pickup: ride.pickup,
          destination: ride.destination,
          stops: ride.stops,
          fare: ride.fare.total,
          driverSearch: driverSearchTiming,
          routeInfo: ride.routeInfo,
        };
        if (isReservation) {
          rideDriverSocketHelper.emitReservationRequest(
            driver.driverId.toString(),
            payload,
          );
        } else {
          rideDriverSocketHelper.emitRideRequest(
            driver.driverId.toString(),
            payload,
          );
        }
      });

      // Schedule visibility timeout for each new driver
      newDrivers.forEach((driver: any) => {
        driverVisibilityQueue.add(
          `driver-visibility-${rideId}-${driver.driverId}`,
          {
            rideId,
            driverId: driver.driverId.toString(),
            userId,
          },
          {
            delay: visibilityDurationSeconds * 1000,
            jobId: `driver-visibility-${rideId}-${driver.driverId}`,
          },
        );
      });

      logger.info(
        `Expanded search radius to ${newRadius}km for ride ${rideId}, notified ${newDrivers.length} new drivers`,
      );

      // If no new drivers accept/reject within their visibility period, the driver visibility worker
      // will automatically trigger the next expansion when all drivers have responded
    } catch (error: any) {
      logger.error(
        `Error processing radius expansion for ride ${rideId}:`,
        error,
      );
      throw error;
    }
  },
  {
    connection: connectionOptions,
    concurrency: 5,
  },
);

/**
 * Worker to handle periodic driver availability checks
 * This worker runs every minute to check if drivers whose availability is currently false
 * should be automatically set to true when their break/cooldown time ends
 */
const driverAvailabilityWorker = new Worker(
  QUEUE_NAMES.DRIVER_AVAILABILITY_CHECK,
  async (job: Job<DriverAvailabilityCheckJobData>) => {
    try {
      const now = new Date();

      // Check for online drivers whose selfie verification has expired
      try {
        const systemConfig = await getSystemConfig();
        const intervalMinutes =
          systemConfig.driverSelfieVerificationIntervalMinutes ?? 720;
        const intervalMs = intervalMinutes * 60 * 1000;
        const thresholdDate = new Date(Date.now() - intervalMs);

        const onlineExpiredDrivers = await Driver.find({
          driverAvailabilityStatus: "online",
          "availability.canReceiveRide": { $ne: false },
          $or: [
            { lastVerificationDate: { $exists: false } },
            { lastVerificationDate: null },
            { lastVerificationDate: { $lt: thresholdDate } },
          ],
        });

        for (const driver of onlineExpiredDrivers) {
          try {
            await Driver.findOneAndUpdate(
              { _id: driver._id },
              {
                $set: {
                  "availability.canReceiveRide": false,
                  "availability.blockedReason": "selfie_verification_required",
                  "availability.blockedUntil": null,
                },
              },
            );

            // Notify driver's app in real-time via Socket.IO
            const { socketHelper } = require("../helpers/socketHelper");
            socketHelper.sendToUser(
              driver.userId.toString(),
              "driver-duty-limit-reached",
              {
                canReceiveRide: false,
                blockedReason: "selfie_verification_required",
                blockedUntil: null,
                remainingHours: 0,
                remainingMinutes: 0,
              },
            );

            logger.info(
              `Driver ${driver.userId} blocked in background because selfie verification expired.`,
            );
          } catch (err: any) {
            logger.error(
              `Failed to block driver ${driver.userId} for expired selfie: ${err.message}`,
            );
          }
        }
      } catch (err: any) {
        logger.error(
          `Error in background driver selfie expiration check: ${err.message}`,
        );
      }

      // Find all drivers who are online and update/recalculate their availability
      // This will automatically block any driver who reaches their limit and broadcast the event,
      // as well as send updated countdowns to already blocked drivers.
      try {
        const onlineDrivers = await Driver.find({
          driverAvailabilityStatus: "online",
        });

        for (const driver of onlineDrivers) {
          try {
            await DriverDutyPolicyServices.updateDriverAvailability(
              driver.userId.toString(),
            );
          } catch (err: any) {
            logger.error(
              `Failed to update availability for online driver ${driver.userId}: ${err.message}`,
            );
          }
        }
      } catch (err: any) {
        logger.error(
          `Error in background online drivers availability check: ${err.message}`,
        );
      }

      // Find all drivers who are currently unavailable (canReceiveRide: false)
      // and have a blockedUntil time that has passed
      const driversToUpdate = await Driver.find({
        "availability.canReceiveRide": false,
        "availability.blockedUntil": { $lte: now },
      });

      if (driversToUpdate.length === 0) {
        logger.info("No drivers need availability update");
        return;
      }

      let updatedCount = 0;

      for (const driver of driversToUpdate) {
        try {
          // Re-check availability using the duty policy service
          const availabilityData =
            await DriverDutyPolicyServices.getDriverAvailability(
              driver.userId.toString(),
            );

          // If the driver is now eligible to receive rides, update their availability
          if (availabilityData.canReceiveRide) {
            await Driver.findOneAndUpdate(
              { _id: driver._id },
              {
                $set: {
                  "availability.canReceiveRide": true,
                  "availability.blockedReason": null,
                  "availability.blockedUntil": null,
                },
              },
            );

            // Send socket notification to driver
            rideDriverSocketHelper.emitDriverAvailable(
              driver.userId.toString(),
              {
                canReceiveRide: true,
                blockedReason: null,
                blockedUntil: null,
              },
            );

            updatedCount++;
            logger.info(
              `Driver ${driver.userId} availability updated to true automatically`,
            );
          }
        } catch (error: any) {
          logger.error(
            `Error updating availability for driver ${driver.userId}:`,
            error.message,
          );
        }
      }

      logger.info(
        `Driver availability check completed: ${updatedCount} drivers updated out of ${driversToUpdate.length} checked`,
      );
    } catch (error: any) {
      logger.error("Error in driver availability worker:", error.message);
      throw error;
    }
  },
  {
    connection: connectionOptions,
    concurrency: 5,
  },
);

import { processReservationReminders } from "../services/reservationReminderService";

const reservationReminderWorker = new Worker(
  QUEUE_NAMES.RESERVATION_REMINDER,
  async (job: Job) => {
    await processReservationReminders();
  },
  {
    connection: connectionOptions,
    concurrency: 2,
  },
);

const driverRewardsWorker = new Worker(
  QUEUE_NAMES.DRIVER_REWARDS_CHECK,
  async (job: Job) => {
    // 1. Run filter expiration check
    await DestinationFilterService.expireFilters();

    // 2. Run daily downgrade checks & quota resets at configured dailyQuotaResetTime and timezone
    const config = await getSystemConfig();
    const resetTimeStr = config.driverRewards?.dailyQuotaResetTime || "00:00";
    const [hours, minutes] = resetTimeStr.split(":").map(Number);
    const configuredTimezone = config.driverRewards?.timezone || "Asia/Dhaka";

    const nowInZone = DateTime.now().setZone(configuredTimezone);
    if (nowInZone.hour === hours && nowInZone.minute === minutes) {
      await PointsService.processScheduledDowngrades();

      // Send daily reset push notification to all online drivers
      const onlineDrivers = await Driver.find({
        driverAvailabilityStatus: "online",
      });
      for (const d of onlineDrivers) {
        sendNotifications({
          receiver: d.userId,
          title: "Daily Quota Reset 🔄",
          text: "Your daily destination filter quota and limits have been reset.",
          type: NOTIFICATION_TYPE.DRIVER,
        }).catch((err) =>
          logger.error("Daily Reset Notification error:", err.message),
        );
      }
      logger.info("Sent daily quota reset notifications to online drivers.");
    }
  },
  {
    connection: connectionOptions,
    concurrency: 1,
  },
);

// Error handlers
rideExpirationWorker.on("error", (err) => {
  logger.error("Ride expiration worker error:", err);
});

driverVisibilityWorker.on("error", (err) => {
  logger.error("Driver visibility worker error:", err);
});

radiusExpansionWorker.on("error", (err) => {
  logger.error("Radius expansion worker error:", err);
});

driverAvailabilityWorker.on("error", (err) => {
  logger.error("Driver availability worker error:", err);
});

reservationReminderWorker.on("error", (err) => {
  logger.error("Reservation reminder worker error:", err);
});

driverRewardsWorker.on("error", (err) => {
  logger.error("Driver rewards worker error:", err);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info("Closing BullMQ workers...");
  await Promise.all([
    rideExpirationWorker.close(),
    driverVisibilityWorker.close(),
    radiusExpansionWorker.close(),
    driverAvailabilityWorker.close(),
    reservationReminderWorker.close(),
    driverRewardsWorker.close(),
  ]);
  logger.info("BullMQ workers closed");
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export {
  rideExpirationWorker,
  driverVisibilityWorker,
  radiusExpansionWorker,
  driverAvailabilityWorker,
  reservationReminderWorker,
  driverRewardsWorker,
};
