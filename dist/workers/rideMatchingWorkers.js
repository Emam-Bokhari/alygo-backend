"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.driverRewardsWorker = exports.reservationReminderWorker = exports.driverAvailabilityWorker = exports.radiusExpansionWorker = exports.driverVisibilityWorker = exports.rideExpirationWorker = void 0;
const bullmq_1 = require("bullmq");
const luxon_1 = require("luxon");
const ride_model_1 = require("../app/modules/ride/ride.model");
const ride_constant_1 = require("../app/modules/ride/ride.constant");
const socketHelper_1 = require("../helpers/socketHelper");
const logger_1 = require("../shared/logger");
const rideSearchTimingHelper_1 = require("../helpers/rideSearchTimingHelper");
const timezoneHelper_1 = require("../shared/timezoneHelper");
const bullmq_2 = require("../config/bullmq");
const systemConfigHelper_1 = require("../helpers/systemConfigHelper");
const driver_model_1 = require("../app/modules/driver/driver.model");
const driverDutyPolicy_service_1 = require("../app/modules/driverDutyPolicy/driverDutyPolicy.service");
const destinationFilter_service_1 = require("../app/modules/tier/destinationFilter.service");
const points_service_1 = require("../app/modules/tier/points.service");
const notificationsHelper_1 = require("../helpers/notificationsHelper");
const notification_constant_1 = require("../app/modules/notification/notification.constant");
// Import the triggerImmediateRadiusExpansion function from ride service
// We need to dynamically import it to avoid circular dependency
let triggerImmediateRadiusExpansion = null;
const getTriggerFunction = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!triggerImmediateRadiusExpansion) {
        const rideService = yield Promise.resolve().then(() => __importStar(require("../app/modules/ride/ride.service")));
        triggerImmediateRadiusExpansion =
            rideService.RideServices.triggerImmediateRadiusExpansion;
    }
    return triggerImmediateRadiusExpansion;
});
/**
 * Worker to handle ride request expiration (5-minute lifetime)
 */
const rideExpirationWorker = new bullmq_1.Worker(bullmq_2.QUEUE_NAMES.RIDE_EXPIRATION, (job) => __awaiter(void 0, void 0, void 0, function* () {
    const { rideId, userId } = job.data;
    try {
        const ride = yield ride_model_1.Ride.findOne({
            _id: rideId,
            status: ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
        });
        if (!ride) {
            logger_1.logger.info(`Ride ${rideId} already accepted or cancelled, skipping expiration`);
            return;
        }
        // Update ride status to EXPIRED
        ride.status = ride_constant_1.RIDE_STATUS.EXPIRED;
        ride.cancellation = {
            cancelledBy: ride_constant_1.CANCELLED_BY.ADMIN,
            cancellationReasonName: "Ride request expired. No driver accepted within the maximum time limit.",
            cancellationFee: 0,
            driverCompensation: 0,
            platformShare: 0,
            cancelledAt: new Date(),
        };
        yield ride.save();
        // Calculate driver search timing for notification
        const driverSearchTiming = (0, rideSearchTimingHelper_1.calculateDriverSearchTiming)(ride);
        // Notify user
        socketHelper_1.socketHelper.sendToUser(userId, "ride-expired", {
            rideId: ride._id,
            message: "Request expired. No driver found within the time limit.",
            driverSearch: driverSearchTiming,
        });
        logger_1.logger.info(`Ride ${rideId} expired after 5 minutes`);
    }
    catch (error) {
        logger_1.logger.error(`Error processing ride expiration for ride ${rideId}:`, error.message);
        throw error;
    }
}), {
    connection: bullmq_2.connectionOptions,
    concurrency: 5,
});
exports.rideExpirationWorker = rideExpirationWorker;
/**
 * Worker to handle driver visibility timeout (60 seconds per driver)
 */
const driverVisibilityWorker = new bullmq_1.Worker(bullmq_2.QUEUE_NAMES.DRIVER_VISIBILITY, (job) => __awaiter(void 0, void 0, void 0, function* () {
    const { rideId, driverId, userId } = job.data;
    try {
        const ride = yield ride_model_1.Ride.findOne({
            _id: rideId,
            status: ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
        });
        if (!ride) {
            logger_1.logger.info(`Ride ${rideId} already accepted or cancelled, skipping driver visibility timeout`);
            return;
        }
        // Update the driver's notification status to EXPIRED
        const driverNotification = ride.driverMatching.notifiedDrivers.find((d) => d.driverId.toString() === driverId);
        if (driverNotification && driverNotification.status === "sent") {
            driverNotification.status = "expired";
            driverNotification.respondedAt = new Date();
            yield ride.save();
            // Calculate driver search timing for notification
            const driverSearchTiming = (0, rideSearchTimingHelper_1.calculateDriverSearchTiming)(ride);
            // Notify driver to remove the request from their screen
            socketHelper_1.socketHelper.sendToUser(driverId, "ride-request-expired", {
                rideId: ride._id,
                driverSearch: driverSearchTiming,
            });
            logger_1.logger.info(`Driver ${driverId} visibility expired for ride ${rideId}`);
            // Check if all drivers have now responded (accepted, rejected, or expired)
            const allDriversResponded = ride.driverMatching.notifiedDrivers.every((d) => d.status !== "sent");
            // If all drivers have responded and no one accepted, trigger immediate radius expansion
            if (allDriversResponded &&
                ride.status === ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER) {
                const triggerFunc = yield getTriggerFunction();
                yield triggerFunc(ride);
            }
        }
    }
    catch (error) {
        logger_1.logger.error(`Error processing driver visibility for driver ${driverId}:`, error.message);
        throw error;
    }
}), {
    connection: bullmq_2.connectionOptions,
    concurrency: 10,
});
exports.driverVisibilityWorker = driverVisibilityWorker;
/**
 * Worker to handle progressive radius expansion
 */
const radiusExpansionWorker = new bullmq_1.Worker(bullmq_2.QUEUE_NAMES.RADIUS_EXPANSION, (job) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { rideId, userId, pickupLocation, currentRadiusKm, rideCategoryId, serviceCategoryId, expansionCount, } = job.data;
    try {
        const ride = yield ride_model_1.Ride.findOne({
            _id: rideId,
            status: ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
        });
        if (!ride) {
            logger_1.logger.info(`Ride ${rideId} already accepted or cancelled, skipping radius expansion`);
            return;
        }
        // Check if we've reached the maximum radius
        const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
        const maxRadius = systemConfig.driverMatching.maxSearchRadiusKm;
        if (currentRadiusKm >= maxRadius) {
            logger_1.logger.info(`Ride ${rideId} reached maximum search radius, stopping expansion`);
            return;
        }
        // Calculate new radius
        const newRadius = currentRadiusKm + systemConfig.driverMatching.radiusExpansionDistanceKm;
        // Import and call the driver matching function
        const { findEligibleDriversInRadius } = yield Promise.resolve().then(() => __importStar(require("../services/driverMatchingService")));
        const newDrivers = yield findEligibleDriversInRadius({
            pickupLocation,
            radiusKm: newRadius,
            rideCategoryId,
            serviceCategoryId,
            excludeDriverIds: ride.driverMatching.notifiedDrivers.map((d) => d.driverId.toString()),
            rideServiceAreaId: (_a = ride.serviceAreaId) === null || _a === void 0 ? void 0 : _a.toString(),
            rideDestination: ride.destination.location,
            rideType: ride.rideType,
            scheduledAt: ride.scheduledAt,
        });
        if (newDrivers.length === 0) {
            logger_1.logger.info(`No new drivers found in expanded radius ${newRadius}km for ride ${rideId}`);
            // If no drivers found and we haven't reached max radius, schedule next expansion with delay
            if (newRadius < maxRadius) {
                const nextRadius = newRadius + systemConfig.driverMatching.radiusExpansionDistanceKm;
                yield bullmq_2.radiusExpansionQueue.add(`radius-expansion-${rideId}`, {
                    rideId,
                    userId,
                    pickupLocation,
                    currentRadiusKm: newRadius,
                    rideCategoryId,
                    serviceCategoryId,
                    expansionCount: expansionCount + 1,
                }, {
                    jobId: `radius-expansion-${rideId}-${expansionCount + 1}`,
                    delay: systemConfig.driverMatching.driverVisibilityDurationSeconds *
                        1000,
                });
                logger_1.logger.info(`Scheduled next radius expansion to ${nextRadius}km for ride ${rideId}`);
            }
            return;
        }
        // Add new drivers to the ride's notified drivers list
        const newDriverNotifications = newDrivers.map((driver) => ({
            driverId: driver.driverId,
            sentAt: new Date(),
            status: "sent",
        }));
        ride.driverMatching.notifiedDrivers.push(...newDriverNotifications);
        ride.driverMatching.searchRadiusKm = newRadius;
        yield ride.save();
        // Calculate driver search timing for notifications
        const driverSearchTiming = (0, rideSearchTimingHelper_1.calculateDriverSearchTiming)(ride);
        // Send ride requests to new drivers via socket
        newDrivers.forEach((driver) => {
            socketHelper_1.socketHelper.sendToUser(driver.driverId.toString(), "ride-request", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { pickup: ride.pickup, destination: ride.destination, stops: ride.stops, fare: ride.fare.total, routeInfo: ride.routeInfo, driverSearch: driverSearchTiming }));
        });
        // Schedule visibility timeout for each new driver
        newDrivers.forEach((driver) => {
            bullmq_2.driverVisibilityQueue.add(`driver-visibility-${rideId}-${driver.driverId}`, {
                rideId,
                driverId: driver.driverId.toString(),
                userId,
            }, {
                delay: systemConfig.driverMatching.driverVisibilityDurationSeconds *
                    1000,
                jobId: `driver-visibility-${rideId}-${driver.driverId}`,
            });
        });
        logger_1.logger.info(`Expanded search radius to ${newRadius}km for ride ${rideId}, notified ${newDrivers.length} new drivers`);
        // If no new drivers accept/reject within their visibility period, the driver visibility worker
        // will automatically trigger the next expansion when all drivers have responded
    }
    catch (error) {
        logger_1.logger.error(`Error processing radius expansion for ride ${rideId}:`, error);
        throw error;
    }
}), {
    connection: bullmq_2.connectionOptions,
    concurrency: 5,
});
exports.radiusExpansionWorker = radiusExpansionWorker;
/**
 * Worker to handle periodic driver availability checks
 * This worker runs every minute to check if drivers whose availability is currently false
 * should be automatically set to true when their break/cooldown time ends
 */
const driverAvailabilityWorker = new bullmq_1.Worker(bullmq_2.QUEUE_NAMES.DRIVER_AVAILABILITY_CHECK, (job) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        // Find all drivers who are currently unavailable (canReceiveRide: false)
        // and have a blockedUntil time that has passed
        const driversToUpdate = yield driver_model_1.Driver.find({
            "availability.canReceiveRide": false,
            "availability.blockedUntil": { $lte: now },
        });
        if (driversToUpdate.length === 0) {
            logger_1.logger.info("No drivers need availability update");
            return;
        }
        let updatedCount = 0;
        for (const driver of driversToUpdate) {
            try {
                // Re-check availability using the duty policy service
                const availabilityData = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getDriverAvailability(driver.userId.toString());
                // If the driver is now eligible to receive rides, update their availability
                if (availabilityData.canReceiveRide) {
                    yield driver_model_1.Driver.findOneAndUpdate({ _id: driver._id }, {
                        $set: {
                            "availability.canReceiveRide": true,
                            "availability.blockedReason": null,
                            "availability.blockedUntil": null,
                        },
                    });
                    // Send socket notification to driver
                    socketHelper_1.socketHelper.sendToUser(driver.userId.toString(), "driver-available", {
                        canReceiveRide: true,
                        blockedReason: null,
                        blockedUntil: null,
                    });
                    updatedCount++;
                    logger_1.logger.info(`Driver ${driver.userId} availability updated to true automatically`);
                }
            }
            catch (error) {
                logger_1.logger.error(`Error updating availability for driver ${driver.userId}:`, error.message);
            }
        }
        logger_1.logger.info(`Driver availability check completed: ${updatedCount} drivers updated out of ${driversToUpdate.length} checked`);
    }
    catch (error) {
        logger_1.logger.error("Error in driver availability worker:", error.message);
        throw error;
    }
}), {
    connection: bullmq_2.connectionOptions,
    concurrency: 5,
});
exports.driverAvailabilityWorker = driverAvailabilityWorker;
const reservationReminderService_1 = require("../services/reservationReminderService");
const reservationReminderWorker = new bullmq_1.Worker(bullmq_2.QUEUE_NAMES.RESERVATION_REMINDER, (job) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, reservationReminderService_1.processReservationReminders)();
}), {
    connection: bullmq_2.connectionOptions,
    concurrency: 2,
});
exports.reservationReminderWorker = reservationReminderWorker;
const driverRewardsWorker = new bullmq_1.Worker(bullmq_2.QUEUE_NAMES.DRIVER_REWARDS_CHECK, (job) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // 1. Run filter expiration check
    yield destinationFilter_service_1.DestinationFilterService.expireFilters();
    // 2. Run daily downgrade checks & quota resets at configured dailyQuotaResetTime and timezone
    const config = yield (0, systemConfigHelper_1.getSystemConfig)();
    const resetTimeStr = ((_a = config.driverRewards) === null || _a === void 0 ? void 0 : _a.dailyQuotaResetTime) || "00:00";
    const [hours, minutes] = resetTimeStr.split(":").map(Number);
    const configuredTimezone = ((_b = config.driverRewards) === null || _b === void 0 ? void 0 : _b.timezone) || "Asia/Dhaka";
    const nowInZone = luxon_1.DateTime.now().setZone(configuredTimezone);
    if (nowInZone.hour === hours && nowInZone.minute === minutes) {
        yield points_service_1.PointsService.processScheduledDowngrades();
        // Send daily reset push notification to all online drivers
        const onlineDrivers = yield driver_model_1.Driver.find({
            driverAvailabilityStatus: "online",
        });
        for (const d of onlineDrivers) {
            (0, notificationsHelper_1.sendNotifications)({
                receiver: d.userId,
                title: "Daily Quota Reset 🔄",
                text: "Your daily destination filter quota and limits have been reset.",
                type: notification_constant_1.NOTIFICATION_TYPE.DRIVER,
            }).catch((err) => logger_1.logger.error("Daily Reset Notification error:", err.message));
        }
        logger_1.logger.info("Sent daily quota reset notifications to online drivers.");
    }
}), {
    connection: bullmq_2.connectionOptions,
    concurrency: 1,
});
exports.driverRewardsWorker = driverRewardsWorker;
// Error handlers
rideExpirationWorker.on("error", (err) => {
    logger_1.logger.error("Ride expiration worker error:", err);
});
driverVisibilityWorker.on("error", (err) => {
    logger_1.logger.error("Driver visibility worker error:", err);
});
radiusExpansionWorker.on("error", (err) => {
    logger_1.logger.error("Radius expansion worker error:", err);
});
driverAvailabilityWorker.on("error", (err) => {
    logger_1.logger.error("Driver availability worker error:", err);
});
reservationReminderWorker.on("error", (err) => {
    logger_1.logger.error("Reservation reminder worker error:", err);
});
driverRewardsWorker.on("error", (err) => {
    logger_1.logger.error("Driver rewards worker error:", err);
});
// Graceful shutdown
const gracefulShutdown = () => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.info("Closing BullMQ workers...");
    yield Promise.all([
        rideExpirationWorker.close(),
        driverVisibilityWorker.close(),
        radiusExpansionWorker.close(),
        driverAvailabilityWorker.close(),
        reservationReminderWorker.close(),
        driverRewardsWorker.close(),
    ]);
    logger_1.logger.info("BullMQ workers closed");
});
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
